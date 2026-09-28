<?php
include 'db_connect.php';

// Verificar si la columna 'plan' ya existe
$check_column = $conn->query("SHOW COLUMNS FROM companies LIKE 'plan'");

if ($check_column->num_rows == 0) {
    // La columna no existe, agregarla
    $sql = "ALTER TABLE companies ADD COLUMN plan VARCHAR(20) DEFAULT 'basic'";
    if ($conn->query($sql) === TRUE) {
        echo "Columna 'plan' agregada exitosamente.";
    } else {
        echo "Error al agregar la columna 'plan': " . $conn->error;
    }
} else {
    echo "La columna 'plan' ya existe.";
}

$conn->close();
?>
