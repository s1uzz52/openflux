#ifndef OPENFLUX_ANDROID_BRIDGE_H
#define OPENFLUX_ANDROID_BRIDGE_H

void openflux_emit_packet(const char *data, int length);
int openflux_protect_socket(int fd);

#endif
