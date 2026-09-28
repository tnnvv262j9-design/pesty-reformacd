<?php
// Asegurarse de que no haya salida antes de los headers
ob_start();

// Habilitar el registro de errores para depuración sin mostrarlo al usuario
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'php-errors.log');

// Aumentar límites de PHP para permitir subidas más grandes
ini_set('upload_max_filesize', '100M');
ini_set('post_max_size', '100M');
ini_set('max_execution_time', '300');
ini_set('memory_limit', '256M');
ini_set('max_file_uploads', '50');

// Función para convertir unidades
function convertUnits($quantity, $fromUnit, $toUnit) {
    // Si las unidades son iguales, no hay conversión
    if ($fromUnit === $toUnit) {
        return $quantity;
    }
    
    // Normalizar unidades a minúsculas
    $fromUnit = strtolower($fromUnit);
    $toUnit = strtolower($toUnit);
    
    // Conversiones de volumen (líquidos)
    $volumeConversions = [
        'ml' => 1,
        'l' => 1000,
        'oz' => 29.5735, // onzas fluidas
        'gal' => 3785.41 // galones
    ];
    
    // Conversiones de peso (sólidos)
    $weightConversions = [
        'g' => 1,
        'kg' => 1000,
        'oz' => 28.3495, // onzas de peso
        'lb' => 453.592 // libras
    ];
    
    // Conversiones de conteo (cebos, trampas, etc.)
    $countConversions = [
        'unidades' => 1,
        'piezas' => 1,
        'und' => 1,
        'pcs' => 1
    ];
    
    // Verificar si ambas unidades están en el mismo sistema
    $fromInVolume = isset($volumeConversions[$fromUnit]);
    $toInVolume = isset($volumeConversions[$toUnit]);
    $fromInWeight = isset($weightConversions[$fromUnit]);
    $toInWeight = isset($weightConversions[$toUnit]);
    $fromInCount = isset($countConversions[$fromUnit]);
    $toInCount = isset($countConversions[$toUnit]);
    
    // Solo permitir conversiones dentro del mismo sistema
    if ($fromInVolume && $toInVolume) {
        // Convertir a ml primero, luego a la unidad destino
        $inMl = $quantity * $volumeConversions[$fromUnit];
        return $inMl / $volumeConversions[$toUnit];
    } elseif ($fromInWeight && $toInWeight) {
        // Convertir a gramos primero, luego a la unidad destino
        $inGrams = $quantity * $weightConversions[$fromUnit];
        return $inGrams / $weightConversions[$toUnit];
    } elseif ($fromInCount && $toInCount) {
        // Para unidades de conteo, la conversión es directa (1:1)
        return $quantity * $countConversions[$fromUnit] / $countConversions[$toUnit];
    }
    
    // No se puede convertir entre sistemas diferentes (volumen <-> peso <-> conteo)
    return false;
}

try {
    include 'db_connect.php';
    // Asegurar que la conexión use utf8mb4 collation
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (Exception $e) {
    ob_clean();
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos']);
    exit();
}

// Limpiar cualquier salida anterior
ob_clean();

header('Content-Type: application/json');

// --- Debug: Log received data ---
error_log("POST data: " . print_r($_POST, true));
error_log("FILES data: " . print_r($_FILES, true));

// --- Validar datos de $_POST ---
if (!isset($_POST['service_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan datos esenciales (ID de servicio). POST recibido: ' . json_encode(array_keys($_POST))]);
    exit();
}

$service_id = intval($_POST['service_id']);

// Construir el objeto de datos del reporte a partir de $_POST
$report_data_obj = new stdClass();
$report_data_obj->clientContact = $_POST['clientContact'] ?? '';
$report_data_obj->serviceDuration = $_POST['serviceDuration'] ?? '';
$report_data_obj->detectedPests = $_POST['detectedPests'] ?? '';
$report_data_obj->infestationLevel = $_POST['infestationLevel'] ?? 'Leve';
$report_data_obj->inspectionMethod = $_POST['inspectionMethod'] ?? 'Inspección Visual';
$report_data_obj->affectedAreas = $_POST['affectedAreas'] ?? '';
$report_data_obj->treatmentMethod = $_POST['treatmentMethod'] ?? '';
$report_data_obj->safetyRecommendations = $_POST['safetyRecommendations'] ?? '';
$report_data_obj->recommendations = $_POST['recommendations'] ?? '';
$report_data_obj->appliesWarranty = $_POST['appliesWarranty'] ?? 'no';
$report_data_obj->warrantyDuration = $_POST['warrantyDuration'] ?? '';

// Hotel Specific Fields
$report_data_obj->hotelAreas = $_POST['hotelAreas'] ?? '';
$report_data_obj->hotelPests = $_POST['hotelPests'] ?? '';
$report_data_obj->hotelMethods = $_POST['hotelMethods'] ?? '';
$report_data_obj->hotelRoomActivity = $_POST['hotelRoomActivity'] ?? '';
$report_data_obj->hotelInfestationLevel = $_POST['hotelInfestationLevel'] ?? '';
$report_data_obj->hotelHousekeeping = $_POST['hotelHousekeeping'] ?? '';
$report_data_obj->hotelMaintenance = $_POST['hotelMaintenance'] ?? '';
$report_data_obj->hotelTreatedRooms = $_POST['hotelTreatedRooms'] ?? '';
$report_data_obj->hotelTreatmentType = $_POST['hotelTreatmentType'] ?? '';
$report_data_obj->hotelTreatmentReason = $_POST['hotelTreatmentReason'] ?? '';
$report_data_obj->hotelInspectionMethods = $_POST['hotelInspectionMethods'] ?? '';
$report_data_obj->hotelConditions = $_POST['hotelConditions'] ?? '';
$report_data_obj->hotelSanitaryRisks = $_POST['hotelSanitaryRisks'] ?? '';
$report_data_obj->hotelRecommendations = $_POST['hotelRecommendations'] ?? '';

// Casino Specific Fields
$report_data_obj->casinoAreas = $_POST['casinoAreas'] ?? '';
$report_data_obj->casinoPests = $_POST['casinoPests'] ?? '';
$report_data_obj->casinoMethods = $_POST['casinoMethods'] ?? '';
$report_data_obj->casinoRoomActivity = $_POST['casinoRoomActivity'] ?? '';
$report_data_obj->casinoInfestationLevel = $_POST['casinoInfestationLevel'] ?? '';
$report_data_obj->casinoHousekeeping = $_POST['casinoHousekeeping'] ?? '';
$report_data_obj->casinoMaintenance = $_POST['casinoMaintenance'] ?? '';
$report_data_obj->casinoTreatedMachines = $_POST['casinoTreatedMachines'] ?? '';
$report_data_obj->casinoTreatmentType = $_POST['casinoTreatmentType'] ?? '';
$report_data_obj->casinoTreatmentReason = $_POST['casinoTreatmentReason'] ?? '';
$report_data_obj->casinoInspectionMethods = $_POST['casinoInspectionMethods'] ?? '';
$report_data_obj->casinoConditions = $_POST['casinoConditions'] ?? '';
$report_data_obj->casinoSanitaryRisks = $_POST['casinoSanitaryRisks'] ?? '';
$report_data_obj->casinoRecommendations = $_POST['casinoRecommendations'] ?? '';

// Maquiladora Specific Fields
$report_data_obj->maquiladoraAreas = $_POST['maquiladoraAreas'] ?? '';
$report_data_obj->maquiladoraPests = $_POST['maquiladoraPests'] ?? '';
$report_data_obj->maquiladoraMethods = $_POST['maquiladoraMethods'] ?? '';
$report_data_obj->maquiladoraActivityDetail = $_POST['maquiladoraActivityDetail'] ?? '';
$report_data_obj->maquiladoraInfestationLevel = $_POST['maquiladoraInfestationLevel'] ?? '';
$report_data_obj->maquiladoraHousekeeping = $_POST['maquiladoraHousekeeping'] ?? '';
$report_data_obj->maquiladoraMaintenance = $_POST['maquiladoraMaintenance'] ?? '';
$report_data_obj->maquiladoraTreatmentType = $_POST['maquiladoraTreatmentType'] ?? '';
$report_data_obj->maquiladoraTreatmentReason = $_POST['maquiladoraTreatmentReason'] ?? '';
$report_data_obj->maquiladoraInspectionMethods = $_POST['maquiladoraInspectionMethods'] ?? '';
$report_data_obj->maquiladoraConditions = $_POST['maquiladoraConditions'] ?? '';
$report_data_obj->maquiladoraSanitaryRisks = $_POST['maquiladoraSanitaryRisks'] ?? '';
$report_data_obj->maquiladoraRecommendations = $_POST['maquiladoraRecommendations'] ?? '';

// Almacen Specific Fields
$report_data_obj->almacenAreas = $_POST['almacenAreas'] ?? '';
$report_data_obj->almacenPests = $_POST['almacenPests'] ?? '';
$report_data_obj->almacenMethods = $_POST['almacenMethods'] ?? '';
$report_data_obj->almacenActivityDetail = $_POST['almacenActivityDetail'] ?? '';
$report_data_obj->almacenInfestationLevel = $_POST['almacenInfestationLevel'] ?? '';
$report_data_obj->almacenHousekeeping = $_POST['almacenHousekeeping'] ?? '';
$report_data_obj->almacenMaintenance = $_POST['almacenMaintenance'] ?? '';
$report_data_obj->almacenTreatmentType = $_POST['almacenTreatmentType'] ?? '';
$report_data_obj->almacenTreatmentReason = $_POST['almacenTreatmentReason'] ?? '';
$report_data_obj->almacenInspectionMethods = $_POST['almacenInspectionMethods'] ?? '';
$report_data_obj->almacenConditions = $_POST['almacenConditions'] ?? '';
$report_data_obj->almacenSanitaryRisks = $_POST['almacenSanitaryRisks'] ?? '';
$report_data_obj->almacenRecommendations = $_POST['almacenRecommendations'] ?? '';

// Negocio Local Specific Fields
$report_data_obj->localAreas = $_POST['localAreas'] ?? '';
$report_data_obj->localPests = $_POST['localPests'] ?? '';
$report_data_obj->localMethods = $_POST['localMethods'] ?? '';
$report_data_obj->localActivityDetail = $_POST['localActivityDetail'] ?? '';
$report_data_obj->localInfestationLevel = $_POST['localInfestationLevel'] ?? '';
$report_data_obj->localHousekeeping = $_POST['localHousekeeping'] ?? '';
$report_data_obj->localMaintenance = $_POST['localMaintenance'] ?? '';
$report_data_obj->localTreatmentType = $_POST['localTreatmentType'] ?? '';
$report_data_obj->localTreatmentReason = $_POST['localTreatmentReason'] ?? '';
$report_data_obj->localInspectionMethods = $_POST['localInspectionMethods'] ?? '';
$report_data_obj->localConditions = $_POST['localConditions'] ?? '';
$report_data_obj->localSanitaryRisks = $_POST['localSanitaryRisks'] ?? '';
$report_data_obj->localRecommendations = $_POST['localRecommendations'] ?? '';

// Directorio para guardar las imágenes
$upload_dir = 'uploads/';
if (!is_dir($upload_dir)) {
    if (!mkdir($upload_dir, 0775, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: No se pudo crear el directorio de subidas. Verifique los permisos del servidor.']);
        exit();
    }
}

/**
 * Guarda un archivo subido y devuelve la ruta.
 *
 * @param array $file_info El array de información del archivo de $_FILES.
 * @param string $upload_dir El directorio de destino.
 * @param string $prefix Un prefijo para el nombre del archivo.
 * @return string|null La ruta del archivo guardado o null si no hay archivo.
 * @throws Exception Si ocurre un error.
 */
function save_uploaded_file($file_info, $upload_dir, $prefix) {
    if (!isset($file_info) || $file_info['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $tmp_name = $file_info["tmp_name"];
    $file_extension = strtolower(pathinfo($file_info["name"], PATHINFO_EXTENSION));
    
    if (!in_array($file_extension, ['jpg', 'jpeg', 'gif', 'png'])) {
        throw new \Exception('Tipo de imagen no válido: ' . $file_extension);
    }

    $filename = $prefix . '_' . uniqid() . '.' . $file_extension;
    $path = $upload_dir . $filename;

    if (move_uploaded_file($tmp_name, $path)) {
        return $path;
    }
    
    throw new \Exception('No se pudo mover el archivo subido al servidor. Verifique los permisos del directorio ' . $upload_dir);
}

/**
 * Reestructura el array $_FILES para que sea más fácil de iterar.
 *
 * @param array $files_array El array $_FILES['input_name'].
 * @return array Un array de archivos reestructurado.
 */
function restructure_files_array($files_array) {
    $restructured_array = [];
    $file_count = count($files_array['name']);
    $file_keys = array_keys($files_array);

    for ($i = 0; $i < $file_count; $i++) {
        foreach ($file_keys as $key) {
            $restructured_array[$i][$key] = $files_array[$key][$i];
        }
    }
    return $restructured_array;
}


try {
    // Procesar Firma del Técnico
    if (isset($_FILES['techSignature']) && $_FILES['techSignature']['error'] === UPLOAD_ERR_OK) {
        $report_data_obj->techSignature = save_uploaded_file($_FILES['techSignature'], $upload_dir, 'sig_tech_' . $service_id);
    } elseif (isset($_POST['techSignatureUrl']) && !empty($_POST['techSignatureUrl'])) {
        // Mantener la URL existente si se proporciona y no está vacía
        $report_data_obj->techSignature = $_POST['techSignatureUrl'];
    }

    // Procesar Firma del Cliente
    if (isset($_FILES['clientSignature']) && $_FILES['clientSignature']['error'] === UPLOAD_ERR_OK) {
        $report_data_obj->clientSignature = save_uploaded_file($_FILES['clientSignature'], $upload_dir, 'sig_client_' . $service_id);
    } elseif (isset($_POST['clientSignatureUrl']) && !empty($_POST['clientSignatureUrl'])) {
        // Mantener la URL existente si se proporciona y no está vacía
        $report_data_obj->clientSignature = $_POST['clientSignatureUrl'];
    }

    // Procesar Fotos Antes del Servicio
    $photos_before = [];
    if (isset($_FILES['photos_before']) && is_array($_FILES['photos_before']['name'])) {
        if (count($_FILES['photos_before']['name']) > 0 && $_FILES['photos_before']['name'][0] !== '') {
            $restructured_photos_before = restructure_files_array($_FILES['photos_before']);
            foreach ($restructured_photos_before as $photo_file) {
                $path = save_uploaded_file($photo_file, $upload_dir, 'photo_before_' . $service_id);
                if ($path) {
                    $photos_before[] = $path;
                }
            }
        }
    }
    
    // Merge with existing photos_before
    if (isset($_POST['existing_photos_before'])) {
        $existing_before = json_decode($_POST['existing_photos_before'], true);
        if (is_array($existing_before)) {
            $photos_before = array_merge($existing_before, $photos_before);
        }
    }
    
    // Procesar Fotos Después del Servicio
    $photos_after = [];
    if (isset($_FILES['photos_after']) && is_array($_FILES['photos_after']['name'])) {
        if (count($_FILES['photos_after']['name']) > 0 && $_FILES['photos_after']['name'][0] !== '') {
            $restructured_photos_after = restructure_files_array($_FILES['photos_after']);
            foreach ($restructured_photos_after as $photo_file) {
                $path = save_uploaded_file($photo_file, $upload_dir, 'photo_after_' . $service_id);
                if ($path) {
                    $photos_after[] = $path;
                }
            }
        }
    }
    
    // Merge with existing photos_after
    if (isset($_POST['existing_photos_after'])) {
        $existing_after = json_decode($_POST['existing_photos_after'], true);
        if (is_array($existing_after)) {
            $photos_after = array_merge($existing_after, $photos_after);
        }
    }
    
    // Usar el nuevo formato con fotos separadas
    $report_data_obj->photos_before = $photos_before;
    $report_data_obj->photos_after = $photos_after;
    // Mantener compatibilidad con el formato anterior combinando ambas
    $report_data_obj->photos = array_merge($photos_before, $photos_after);
    
    // --- GESTIÓN DE INVENTARIO DE QUÍMICOS ---
    if (isset($_POST['chemicals_data']) && !empty($_POST['chemicals_data'])) {
        $chemicals_usage = json_decode($_POST['chemicals_data'], true);
        
        // Solo proceder si es un array válido
        if (is_array($chemicals_usage)) {
            $report_data_obj->chemicals = $chemicals_usage;
            
            // AUTO-FIX: Asegurar que las columnas existan antes de la transacción
            // (ALTER TABLE provoca un commit implícito, por lo que debe ir antes de begin_transaction)
            $cols_to_check = [
                'ml_used' => 'FLOAT NOT NULL DEFAULT 0', 
                'quantity_used' => 'FLOAT NOT NULL DEFAULT 0', 
                'unit_used' => "VARCHAR(20) DEFAULT 'ml'", 
                'cost_at_time' => 'DECIMAL(10, 2) NOT NULL DEFAULT 0'
            ];
            foreach ($cols_to_check as $col => $def) {
                 $check_col_exists = $conn->query("SHOW COLUMNS FROM chemical_usage LIKE '$col'");
                 if ($check_col_exists && $check_col_exists->num_rows == 0) {
                     $conn->query("ALTER TABLE chemical_usage ADD COLUMN $col $def");
                     error_log("Auto-migration: Added column $col to chemical_usage");
                 }
            }

            // AUTO-FIX: inventory_history columns
            $hist_cols_to_check = [
                'company_id' => 'INT NOT NULL AFTER id',
                'previous_stock' => 'FLOAT DEFAULT 0',
                'new_stock' => 'FLOAT DEFAULT 0',
                'notes' => 'TEXT',
                'created_by' => 'INT DEFAULT NULL'
            ];
            foreach ($hist_cols_to_check as $col => $def) {
                 $check_col_exists = $conn->query("SHOW COLUMNS FROM inventory_history LIKE '$col'");
                 if ($check_col_exists && $check_col_exists->num_rows == 0) {
                     $conn->query("ALTER TABLE inventory_history ADD COLUMN $col $def");
                     if ($col === 'company_id') {
                        try { $conn->query("ALTER TABLE inventory_history ADD INDEX (company_id)"); } catch(Exception $e) {}
                     }
                     error_log("Auto-migration: Added column $col to inventory_history");
                 }
            }
            
             // Check for column rename (change_amount -> quantity_change)
            $check_qty_col = $conn->query("SHOW COLUMNS FROM inventory_history LIKE 'quantity_change'");
            if ($check_qty_col && $check_qty_col->num_rows == 0) {
                // Check if old column exists
                $check_old_col = $conn->query("SHOW COLUMNS FROM inventory_history LIKE 'change_amount'");
                if ($check_old_col && $check_old_col->num_rows > 0) {
                     $conn->query("ALTER TABLE inventory_history CHANGE COLUMN change_amount quantity_change FLOAT NOT NULL");
                } else {
                     $conn->query("ALTER TABLE inventory_history ADD COLUMN quantity_change FLOAT NOT NULL");
                }
            }

            $conn->begin_transaction();
            try {
                // Obtener datos del servicio para company_id
                $srv_q = $conn->query("SELECT company_id, technician_id FROM services WHERE id = $service_id");
                if (!$srv_q) throw new Exception("Error al obtener datos del servicio");
                $srv_row = $srv_q->fetch_assoc();
                $company_id = $srv_row['company_id'];
                $technician_id = $srv_row['technician_id'];

                // 1. REVERTIR USOS PREVIOS (Si es edición)
                $prev_usage_sql = "SELECT chemical_id, ml_used FROM chemical_usage WHERE service_id = ?";
                $prev_stmt = $conn->prepare($prev_usage_sql);
                $prev_stmt->bind_param("i", $service_id);
                $prev_stmt->execute();
                $prev_res = $prev_stmt->get_result();
                
                while ($prev_row = $prev_res->fetch_assoc()) {
                    $p_chem_id = $prev_row['chemical_id'];
                    $p_ml_used = $prev_row['ml_used'];
                    // Devolver stock
                    $conn->query("UPDATE chemicals SET current_stock_ml = current_stock_ml + $p_ml_used WHERE id = $p_chem_id");
                }
                
                // Borrar usos previos
                $conn->query("DELETE FROM chemical_usage WHERE service_id = $service_id");
                
                // 2. APLICAR NUEVOS USOS
                $check_stock_stmt = $conn->prepare("SELECT current_stock_ml, name, cost_per_ml, min_stock_ml FROM chemicals WHERE id = ?");
                if (!$check_stock_stmt) throw new Exception("Error preparando consulta check_stock: " . $conn->error);
                
                $update_stock_stmt = $conn->prepare("UPDATE chemicals SET current_stock_ml = current_stock_ml - ? WHERE id = ?");
                if (!$update_stock_stmt) throw new Exception("Error preparando consulta update_stock: " . $conn->error);
                
                $insert_usage_stmt = $conn->prepare("INSERT INTO chemical_usage (service_id, chemical_id, quantity_used, unit_used, ml_used, cost_at_time) VALUES (?, ?, ?, ?, ?, ?)");
                if (!$insert_usage_stmt) throw new Exception("Error preparando consulta insert_usage: " . $conn->error);
                
                $history_stmt = $conn->prepare("INSERT INTO inventory_history (company_id, chemical_id, change_type, quantity_change, previous_stock, new_stock, reference_id, notes, created_by) VALUES (?, ?, 'usage', ?, ?, ?, ?, ?, ?)");
                if (!$history_stmt) throw new Exception("Error preparando consulta history: " . $conn->error);
                
                foreach ($chemicals_usage as $chem) {
                    $chem_id = intval($chem['chemical_id']);
                    $ml_used = floatval($chem['ml_used']);
                    $quantity = floatval($chem['quantity']);
                    $unit = $chem['unit'];
                    
                    // Validar Stock Actual
                    $check_stock_stmt->bind_param("i", $chem_id);
                    $check_stock_stmt->execute();
                    $res = $check_stock_stmt->get_result();
                    if ($row = $res->fetch_assoc()) {
                        $current_stock = floatval($row['current_stock_ml']);
                        $cost_at_time = floatval($row['cost_per_ml']) * $ml_used;
                        $min_stock = floatval($row['min_stock_ml']);
                        
                        if ($current_stock < $ml_used) {
                            throw new Exception("Stock insuficiente para: " . $row['name'] . ". Stock: " . $current_stock . "ml, Req: " . $ml_used . "ml");
                        }
                        
                        $new_stock = $current_stock - $ml_used;
                        
                        // Check for low stock
                        if ($new_stock <= $min_stock) {
                            $low_stock_warnings[] = "⚠️ Stock bajo: " . $row['name'] . " (" . $new_stock . "ml restantes)";
                        }

                        // Actualizar Stock
                        $update_stock_stmt->bind_param("di", $ml_used, $chem_id);
                        $update_stock_stmt->execute();
                        
                        // Insertar Uso
                        $insert_usage_stmt->bind_param("iidddd", $service_id, $chem_id, $quantity, $unit, $ml_used, $cost_at_time);
                        $insert_usage_stmt->execute();
                        
                        // Historial
                        $neg_qty = -$ml_used;
                        $notes = "Uso en Servicio #$service_id";
                        $history_stmt->bind_param("iiddddis", $company_id, $chem_id, $neg_qty, $current_stock, $new_stock, $service_id, $notes, $technician_id);
                        $history_stmt->execute();
                    } else {
                        throw new Exception("Químico ID $chem_id no encontrado en inventario.");
                    }
                }
                
                $conn->commit();
            } catch (Exception $e) {
                $conn->rollback();
                throw $e;
            }
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar el reporte: ' . $e->getMessage()]);
    exit();
}

// Asegurarse de que el JSON se codifique correctamente con UTF-8
$report_data_json = json_encode($report_data_obj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);

// Convertir a UTF-8 si es necesario
if (!mb_check_encoding($report_data_json, 'UTF-8')) {
    $report_data_json = mb_convert_encoding($report_data_json, 'UTF-8', 'auto');
}

// Verificar si hubo un error en la codificación JSON
if ($report_data_json === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al codificar los datos del reporte: ' . json_last_error_msg()]);
    exit();
}



    // AUTO-FIX: Asegurar que la columna report_data exista en services
    $check_report_col = $conn->query("SHOW COLUMNS FROM services LIKE 'report_data'");
    if ($check_report_col && $check_report_col->num_rows == 0) {
         $conn->query("ALTER TABLE services ADD COLUMN report_data LONGTEXT");
         error_log("Auto-migration: Added column report_data to services");
    }

    // Actualizar la base de datos con los datos del reporte, estado y días de refuerzo inteligentes
    $infestation_level = $report_data_obj->infestationLevel ?? 'Leve';
    $new_reinforcement_days = null;

    if ($infestation_level === 'Alta') {
        $new_reinforcement_days = 15;
    } elseif ($infestation_level === 'Moderada') {
        $new_reinforcement_days = 20;
    } elseif ($infestation_level === 'Leve') {
        $new_reinforcement_days = 30;
    }
    
    // Si ya existe un valor manual (o definido previamente) podríamos respetarlo, 
    // pero la petición del usuario es que esto sea "inteligente" basado en el reporte.
    // Así que actualizaremos el campo reinforcement_days.

    try {
        if ($new_reinforcement_days !== null) {
             $sql = "UPDATE services SET report_data = ?, status = 'Realizado', reinforcement_days = ? WHERE id = ?";
             $stmt = $conn->prepare($sql);
             if (!$stmt) throw new Exception('Error preparando consulta: ' . $conn->error);
             $stmt->bind_param('sii', $report_data_json, $new_reinforcement_days, $service_id);
        } else {
             $sql = "UPDATE services SET report_data = ?, status = 'Realizado' WHERE id = ?";
             $stmt = $conn->prepare($sql);
             if (!$stmt) throw new Exception('Error preparando consulta: ' . $conn->error);
             $stmt->bind_param('si', $report_data_json, $service_id);
        }
        
        if ($stmt->execute()) {
            ob_clean();
            $msg = 'Reporte guardado. Próximo refuerzo recomendado en ' . $new_reinforcement_days . ' días.';
            if (!empty($low_stock_warnings)) {
                $msg .= "\n\n" . implode("\n", $low_stock_warnings);
            }
            echo json_encode(['success' => true, 'message' => $msg]);
        } else {
            throw new Exception('Error ejecutando consulta: ' . $stmt->error);
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
    error_log("Error saving service report: " . $e->getMessage());
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar el reporte: ' . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
    ob_end_flush();
}
?>