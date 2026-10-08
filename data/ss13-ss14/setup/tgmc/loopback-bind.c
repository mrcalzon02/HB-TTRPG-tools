/* DreamDaemon has no bind-address option. Restrict its internet sockets to
 * loopback without changing the system firewall or TGMC source. */
extern void *dlsym(void *, const char *);
typedef unsigned int socklen_t;
int bind(int fd, const void *address, socklen_t length) {
    static int (*real_bind)(int, const void *, socklen_t);
    unsigned char local[128];
    unsigned short family;
    if (!real_bind) real_bind = dlsym((void *)-1, "bind");
    if (!real_bind || length > sizeof(local)) return -1;
    for (socklen_t i = 0; i < length; i++) local[i] = ((const unsigned char *)address)[i];
    family = *(const unsigned short *)address;
    if (family == 2 && length >= 16) {
        local[4] = 127; local[5] = 0; local[6] = 0; local[7] = 1;
    } else if (family == 10 && length >= 28) {
        for (int i = 8; i < 24; i++) local[i] = 0;
        local[23] = 1;
    }
    return real_bind(fd, local, length);
}
