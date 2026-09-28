<?php
function checkLimit($conn, $company_id, $type) {
    // Mapa de tipos a tablas y columnas de límite
    $config = [
        'service' => ['table' => 'services', 'limit_col' => 'limit_services', 'default' => 5],
        'client' => ['table' => 'clients', 'limit_col' => 'limit_clients', 'default' => 5],
        'technician' => ['table' => 'technicians', 'limit_col' => 'limit_techs', 'default' => 1],
        'quote' => ['table' => 'quotes', 'limit_col' => 'limit_quotes', 'default' => 5],
        'payment_note' => ['table' => 'payment_notes', 'limit_col' => 'limit_payment_notes', 'default' => 5],
        'document' => ['table' => 'documents', 'limit_col' => 'limit_library', 'default' => 0],
        'chemical' => ['table' => 'chemicals', 'limit_col' => 'limit_chemicals', 'default' => 0]
    ];

    $oldDefaults = [
        'service' => 50,
        'client' => 50,
        'technician' => 1,
        'quote' => 10,
        'payment_note' => 10,
        'document' => 5
    ];

    if (!isset($config[$type])) {
        return ['allowed' => true]; // Tipo desconocido, permitir
    }

    $conf = $config[$type];
    $table = $conf['table'];
    $limit_col = $conf['limit_col'];
    $default_limit = $conf['default'];

    // 1. Obtener el límite de la empresa
    // Intentamos seleccionar la columna específica. Si falla (porque no existe), usamos el default.
    $limit = $default_limit;
    
    // Verificamos si la columna existe en la tabla companies (caché simple o try-catch)
    // Para ser eficientes y compatibles si el script de update no corrió, hacemos una consulta segura.
    // Pero lo ideal es asumir que la DB está actualizada. Si falla la query, capturamos error.
    
    try {
        $stmt = $conn->prepare("SELECT $limit_col, plan, subscription_expiry, subscription_status FROM companies WHERE id = ?");
        if ($stmt) {
            $stmt->bind_param("i", $company_id);
            if ($stmt->execute()) {
                $result = $stmt->get_result();
                if ($row = $result->fetch_assoc()) {
                    $plan = isset($row['plan']) ? $row['plan'] : 'trial';
                    $expiry = isset($row['subscription_expiry']) ? $row['subscription_expiry'] : null;
                    
                    // Verificación de expiración
                    if ($plan !== 'trial' && $expiry !== null) {
                        $expiryTime = strtotime($expiry);
                        if ($expiryTime < time()) {
                            // Suscripción expirada: Downgrade automático
                            $conn->query("UPDATE companies SET plan = 'trial', subscription_status = 'expired' WHERE id = " . intval($company_id));
                            $plan = 'trial';
                            // Recargar límites para el plan trial (o dejar que el código siguiente use los defaults)
                        }
                    }

                    if (isset($row[$limit_col]) && $row[$limit_col] !== null && $plan !== 'trial') {
                        $limit = (int)$row[$limit_col];
                        $oldDefault = isset($oldDefaults[$type]) ? $oldDefaults[$type] : null;
                        if ($oldDefault !== null && $oldDefault !== $default_limit) {
                            if (($plan === null || $plan === '' || $plan === 'basic') && $limit === $oldDefault) {
                                $limit = $default_limit;
                            }
                        }
                    } else if ($plan === 'trial') {
                        $limit = $default_limit; // Usar default para trial
                    }
                }
            }
            $stmt->close();
        }
    } catch (Exception $e) {
        // Si falla (ej. columna no existe), mantenemos el default
        error_log("Error checking limit column $limit_col: " . $e->getMessage());
    }

    // 2. Contar registros actuales
    $count = 0;
    try {
        $stmt_count = $conn->prepare("SELECT COUNT(*) as total FROM $table WHERE company_id = ?");
        if ($stmt_count) {
            $stmt_count->bind_param("i", $company_id);
            if ($stmt_count->execute()) {
                $res_count = $stmt_count->get_result();
                if ($row_count = $res_count->fetch_assoc()) {
                    $count = (int)$row_count['total'];
                }
            }
            $stmt_count->close();
        }
    } catch (Exception $e) {
        error_log("Error counting records for $table: " . $e->getMessage());
        return ['allowed' => false, 'message' => 'Error verificando límites.'];
    }

    // 3. Comparar
    if ($count >= $limit) {
        return [
            'allowed' => false, 
            'message' => "Has alcanzado el límite de tu plan para $type ($count/$limit). Actualiza tu plan para continuar.",
            'current' => $count,
            'limit' => $limit
        ];
    }

    return ['allowed' => true, 'current' => $count, 'limit' => $limit];
}
?>
