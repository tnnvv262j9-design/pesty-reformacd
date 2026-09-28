<?php
include 'db_connect.php';

// Array de columnas de límites y sus valores por defecto (NUEVOS VALORES)
$limits = [
    'limit_services' => 15,
    'limit_clients' => 15,
    'limit_techs' => 1,
    'limit_quotes' => 5,
    'limit_payment_notes' => 5,
    'limit_library' => 5
];

// Valores antiguos que usaba el sistema antes del cambio
$oldDefaults = [
    'limit_services' => 50,
    'limit_clients' => 50,
    'limit_techs' => 1,
    'limit_quotes' => 10,
    'limit_payment_notes' => 10,
    'limit_library' => 5
];

foreach ($limits as $column => $default) {
    $oldDefault = isset($oldDefaults[$column]) ? $oldDefaults[$column] : null;

    // Verificar si la columna existe
    $check_column = $conn->query("SHOW COLUMNS FROM companies LIKE '$column'");
    
    if ($check_column->num_rows == 0) {
        // La columna no existe, agregarla con el nuevo valor por defecto
        $sql = "ALTER TABLE companies ADD COLUMN $column INT DEFAULT $default";
        if ($conn->query($sql) === TRUE) {
            echo "Columna '$column' agregada exitosamente con default $default.<br>";
        } else {
            echo "Error al agregar la columna '$column': " . $conn->error . "<br>";
        }
    } else {
        // La columna ya existe: actualizar el DEFAULT y los valores iniciales del plan básico
        $sqlAlter = "ALTER TABLE companies MODIFY COLUMN $column INT DEFAULT $default";
        if ($conn->query($sqlAlter) === TRUE) {
            echo "Columna '$column' actualizada para usar default $default.<br>";
        } else {
            echo "Error al actualizar el default de '$column': " . $conn->error . "<br>";
        }

        // Solo tocamos filas que siguen con el valor antiguo o NULL y que están en plan básico
        if ($oldDefault !== null && $oldDefault !== $default) {
            $sqlUpdate = "
                UPDATE companies
                SET $column = ?
                WHERE ($column = ? OR $column IS NULL)
                  AND (plan IS NULL OR plan = 'basic')
            ";
            $stmt = $conn->prepare($sqlUpdate);
            if ($stmt) {
                $stmt->bind_param("ii", $default, $oldDefault);
                if ($stmt->execute()) {
                    echo "Filas de '$column' en plan básico actualizadas de $oldDefault a $default.<br>";
                } else {
                    echo "Error al actualizar filas de '$column': " . $stmt->error . "<br>";
                }
                $stmt->close();
            } else {
                echo "Error al preparar el update para '$column': " . $conn->error . "<br>";
            }
        } else {
            echo "No es necesario ajustar filas existentes para '$column'.<br>";
        }
    }
}

$conn->close();
?>
