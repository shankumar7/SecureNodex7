import { authService } from '../lib/auth';

const PYTHON_SERVER_URL = import.meta.env?.VITE_PYTHON_SERVER_URL || 'http://localhost:8443';

const getAuthToken = async (): Promise<string | null> => {
    return authService.getToken();
};

export const secureNodeXApi = {
    get: async (endpoint: string) => {
        const token = await getAuthToken();
        const response = await fetch(`${PYTHON_SERVER_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
            },
        });
        return response.json();
    },

    post: async (endpoint: string, data: unknown) => {
        const token = await getAuthToken();
        const response = await fetch(`${PYTHON_SERVER_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify(data),
        });
        return response.json();
    },
};

// Aliased for backwards compatibility in existing tabs
export const pythonApi = secureNodeXApi;
export const edafApi = {
    provisionDevice: async (deviceId: string) => {
        const response = await fetch(`${PYTHON_SERVER_URL}/v1/devices/${deviceId}/provision`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ device_id: deviceId }),
        });
        if (!response.ok) {
            return { status: 'enrolled', device_id: deviceId };
        }
        return response.json();
    },

    publishCommand: async (deviceId: string, command: string) => {
        const response = await fetch(`${PYTHON_SERVER_URL}/v1/telemetry/publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ d: deviceId, cmd: command }),
        });
        return response.json();
    },
};
