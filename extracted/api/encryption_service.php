<?php
class EncryptionService {
    private $cipher = 'AES-256-CBC';
    private $key;
    
    public function __construct() {
        // Usar una clave fija para simplicidad (en producción debería ser más segura)
        $this->key = hash('sha256', 'pesty_encryption_key_2024', true);
    }
    
    public function encrypt($data) {
        if (empty($data)) {
            return '';
        }
        
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length($this->cipher));
        $encrypted = openssl_encrypt($data, $this->cipher, $this->key, 0, $iv);
        
        if ($encrypted === false) {
            return $data; // Retornar datos originales si falla la encriptación
        }
        
        return base64_encode($iv . $encrypted);
    }
    
    public function decrypt($data) {
        if (empty($data)) {
            return '';
        }
        
        // Si el dato no parece estar encriptado (no contiene caracteres base64), devolverlo tal como está
        if (!preg_match('/^[A-Za-z0-9+\/]*={0,2}$/', $data)) {
            return $data;
        }
        
        $decoded = base64_decode($data, true);
        if ($decoded === false) {
            // Si falla la decodificación base64, probablemente no esté encriptado
            return $data;
        }
        
        $iv_length = openssl_cipher_iv_length($this->cipher);
        if (strlen($decoded) < $iv_length) {
            // Si es muy corto para contener IV, no está encriptado
            return $data;
        }
        
        $iv = substr($decoded, 0, $iv_length);
        $encrypted = substr($decoded, $iv_length);
        
        $decrypted = openssl_decrypt($encrypted, $this->cipher, $this->key, 0, $iv);
        
        if ($decrypted === false) {
            // Si falla la desencriptación, devolver cadena vacía para mostrar N/A
            return '';
        }
        
        return $decrypted;
    }
}
?>