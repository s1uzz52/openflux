#include <jni.h>
#include <pthread.h>
#include "bridge.h"

extern char *OpenFluxStart(char *raw_config);
extern void OpenFluxStop(void);
extern int OpenFluxWritePacket(char *data, int length);
extern char *OpenFluxGetStatus(void);
extern void OpenFluxFreeString(char *value);

static JavaVM *openflux_vm = NULL;
static jobject openflux_sink = NULL;
static jmethodID on_packet = NULL;
static jmethodID protect_socket = NULL;
static pthread_mutex_t sink_mutex = PTHREAD_MUTEX_INITIALIZER;

JNIEXPORT void JNICALL
Java_com_openfluxandroid_OpenFluxNative_nativeInitialize(JNIEnv *env, jclass clazz, jobject sink) {
    (void)clazz;
    pthread_mutex_lock(&sink_mutex);
    (*env)->GetJavaVM(env, &openflux_vm);
    if (openflux_sink != NULL) {
        (*env)->DeleteGlobalRef(env, openflux_sink);
    }
    openflux_sink = (*env)->NewGlobalRef(env, sink);
    jclass sink_class = (*env)->GetObjectClass(env, sink);
    on_packet = (*env)->GetMethodID(env, sink_class, "onPacket", "([B)V");
    protect_socket = (*env)->GetMethodID(env, sink_class, "protectSocket", "(I)Z");
    (*env)->DeleteLocalRef(env, sink_class);
    pthread_mutex_unlock(&sink_mutex);
}

static JNIEnv *openflux_env(int *detach) {
    JNIEnv *env = NULL;
    *detach = 0;
    if (openflux_vm == NULL) return NULL;
    jint result = (*openflux_vm)->GetEnv(openflux_vm, (void **)&env, JNI_VERSION_1_6);
    if (result == JNI_EDETACHED) {
        if ((*openflux_vm)->AttachCurrentThread(openflux_vm, &env, NULL) != JNI_OK) return NULL;
        *detach = 1;
    }
    return env;
}

void openflux_emit_packet(const char *data, int length) {
    int detach = 0;
    JNIEnv *env = openflux_env(&detach);
    if (env == NULL || data == NULL || length <= 0) return;
    pthread_mutex_lock(&sink_mutex);
    if (openflux_sink != NULL && on_packet != NULL) {
        jbyteArray packet = (*env)->NewByteArray(env, length);
        if (packet != NULL) {
            (*env)->SetByteArrayRegion(env, packet, 0, length, (const jbyte *)data);
            (*env)->CallVoidMethod(env, openflux_sink, on_packet, packet);
            if ((*env)->ExceptionCheck(env)) (*env)->ExceptionClear(env);
            (*env)->DeleteLocalRef(env, packet);
        }
    }
    pthread_mutex_unlock(&sink_mutex);
    if (detach) (*openflux_vm)->DetachCurrentThread(openflux_vm);
}

int openflux_protect_socket(int fd) {
    int detach = 0;
    int result = 0;
    JNIEnv *env = openflux_env(&detach);
    if (env == NULL) return 0;
    pthread_mutex_lock(&sink_mutex);
    if (openflux_sink != NULL && protect_socket != NULL) {
        result = (*env)->CallBooleanMethod(env, openflux_sink, protect_socket, (jint)fd) == JNI_TRUE;
        if ((*env)->ExceptionCheck(env)) {
            (*env)->ExceptionClear(env);
            result = 0;
        }
    }
    pthread_mutex_unlock(&sink_mutex);
    if (detach) (*openflux_vm)->DetachCurrentThread(openflux_vm);
    return result;
}

JNIEXPORT jstring JNICALL
Java_com_openfluxandroid_OpenFluxNative_nativeStart(JNIEnv *env, jclass clazz, jstring config) {
    (void)clazz;
    const char *raw = (*env)->GetStringUTFChars(env, config, NULL);
    if (raw == NULL) return (*env)->NewStringUTF(env, "Unable to read VPN configuration");
    char *error = OpenFluxStart((char *)raw);
    (*env)->ReleaseStringUTFChars(env, config, raw);
    if (error == NULL) return NULL;
    jstring result = (*env)->NewStringUTF(env, error);
    OpenFluxFreeString(error);
    return result;
}

JNIEXPORT void JNICALL
Java_com_openfluxandroid_OpenFluxNative_nativeStop(JNIEnv *env, jclass clazz) {
    (void)env;
    (void)clazz;
    OpenFluxStop();
}

JNIEXPORT jboolean JNICALL
Java_com_openfluxandroid_OpenFluxNative_nativeWritePacket(JNIEnv *env, jclass clazz, jbyteArray packet) {
    (void)clazz;
    if (packet == NULL) return JNI_FALSE;
    jsize length = (*env)->GetArrayLength(env, packet);
    if (length <= 0 || length > 65535) return JNI_FALSE;
    jbyte *data = (*env)->GetByteArrayElements(env, packet, NULL);
    if (data == NULL) return JNI_FALSE;
    int accepted = OpenFluxWritePacket((char *)data, (int)length);
    (*env)->ReleaseByteArrayElements(env, packet, data, JNI_ABORT);
    return accepted ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jstring JNICALL
Java_com_openfluxandroid_OpenFluxNative_nativeGetStatus(JNIEnv *env, jclass clazz) {
    (void)clazz;
    char *status = OpenFluxGetStatus();
    if (status == NULL) return (*env)->NewStringUTF(env, "{\"state\":\"ERROR\",\"message\":\"Native status unavailable\"}");
    jstring result = (*env)->NewStringUTF(env, status);
    OpenFluxFreeString(status);
    return result;
}
