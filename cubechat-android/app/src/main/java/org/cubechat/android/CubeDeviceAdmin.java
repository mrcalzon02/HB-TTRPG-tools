package org.cubechat.android;

import android.app.admin.DeviceAdminReceiver;

/**
 * Optional device-owner entry point. Installation alone does not make CubeChat
 * a device owner; managed-device provisioning must be deliberate and external.
 */
public final class CubeDeviceAdmin extends DeviceAdminReceiver {
}
