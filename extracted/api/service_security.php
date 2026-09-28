<?php
// api/service_security.php

class ServiceSecurity {
    private static $secret_key = 'pesty_secure_token_key_v1';

    // Genera un token seguro que incluye el ID y un hash de verificación
    public static function generateToken($service_id) {
        $data = $service_id . '|' . self::$secret_key;
        $hash = hash('sha256', $data);
        // El token es: ID + '.' + primeros 16 caracteres del hash
        return base64_encode($service_id . '.' . substr($hash, 0, 16));
    }

    // Verifica el token y devuelve el ID si es válido, o false si no
    public static function validateToken($token) {
        $decoded = base64_decode($token);
        if (!$decoded || strpos($decoded, '.') === false) {
            return false;
        }

        list($service_id, $hash_check) = explode('.', $decoded);
        $service_id = intval($service_id);

        // Recrear el hash para verificar
        $data = $service_id . '|' . self::$secret_key;
        $hash = hash('sha256', $data);
        $expected_hash = substr($hash, 0, 16);

        if (hash_equals($expected_hash, $hash_check)) {
            return $service_id;
        }

        return false;
    }
}
?>