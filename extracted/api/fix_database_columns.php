<?php
include 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');

function addColumnIfNotExists($conn, $table, $column, $definition) {
    $check = $conn->query("SHOW COLUMNS FROM $table LIKE '$column'");
    if ($check->num_rows == 0) {
        if ($conn->query("ALTER TABLE $table ADD COLUMN $column $definition")) {
            echo "✅ Columna '<strong>$column</strong>' agregada correctamente a la tabla '$table'.<br>";
        } else {
            echo "❌ Error agregando '$column': " . $conn->error . "<br>";
        }
    } else {
        echo "ℹ️ La columna '<strong>$column</strong>' ya existe en '$table'.<br>";
    }
}

echo "<h2>Verificando estructura de base de datos...</h2>";

addColumnIfNotExists($conn, 'companies', 'treatment_methods', 'TEXT DEFAULT NULL');
addColumnIfNotExists($conn, 'companies', 'common_pests', 'TEXT DEFAULT NULL');
addColumnIfNotExists($conn, 'companies', 'treated_areas', 'TEXT DEFAULT NULL');

echo "<br><strong>Proceso finalizado.</strong> Por favor intenta guardar la configuración nuevamente.";
?>
