<?php
// api/view_quote.php
// Prevent output before PDF generation/HTML
ob_start();

include 'db_connect.php';

// Get ID
$id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($id <= 0) {
    die("ID de cotización inválido");
}

// Fetch Quote
$sql = "SELECT q.*, c.name as company_name, c.logo_url, c.contact_phone, c.contact_email, c.contact_address, 
        cl.full_name as client_name, cl.address as client_address, cl.phone as client_phone
        FROM quotes q
        JOIN companies c ON q.company_id = c.id
        JOIN clients cl ON q.client_id = cl.id
        WHERE q.id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
$quote = $result->fetch_assoc();

if (!$quote) {
    die("Cotización no encontrada");
}

// Decode items
$items = json_decode($quote['items'], true);
$currency = '$'; // Default

// Simple HTML View for printing
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Cotización #<?php echo $quote['id']; ?></title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .logo { max-height: 80px; }
        .company-details { text-align: right; }
        .invoice-title { font-size: 2.5rem; color: #444; text-transform: uppercase; margin: 0; }
        .invoice-meta { margin-top: 10px; color: #666; }
        .client-section { margin-bottom: 40px; display: flex; justify-content: space-between; }
        .client-box { background: #f9f9f9; padding: 20px; border-radius: 8px; width: 45%; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .table th { background: #333; color: white; padding: 12px; text-align: left; }
        .table td { border-bottom: 1px solid #ddd; padding: 12px; }
        .totals { text-align: right; margin-top: 20px; }
        .totals-row { display: flex; justify-content: flex-end; margin-bottom: 10px; }
        .totals-label { font-weight: bold; width: 150px; }
        .totals-value { width: 150px; }
        .grand-total { font-size: 1.2rem; color: #2563eb; font-weight: bold; }
        .notes { margin-top: 40px; padding: 20px; background: #fffde7; border-left: 4px solid #fbc02d; font-size: 0.9rem; }
        .print-btn { position: fixed; bottom: 20px; right: 20px; background: #2563eb; color: white; padding: 15px 30px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 10px rgba(0,0,0,0.2); font-weight: bold; }
        @media print { .print-btn { display: none; } body { padding: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <?php if (!empty($quote['logo_url'])): ?>
                <img src="<?php echo htmlspecialchars($quote['logo_url']); ?>" alt="Logo" class="logo">
            <?php else: ?>
                <h2><?php echo htmlspecialchars($quote['company_name']); ?></h2>
            <?php endif; ?>
        </div>
        <div class="company-details">
            <h1 class="invoice-title">Cotización</h1>
            <div class="invoice-meta">Folio: #<?php echo str_pad($quote['id'], 6, '0', STR_PAD_LEFT); ?></div>
            <div class="invoice-meta">Fecha: <?php echo date('d/m/Y', strtotime($quote['issue_date'])); ?></div>
            <?php if($quote['due_date']): ?>
                <div class="invoice-meta">Vence: <?php echo date('d/m/Y', strtotime($quote['due_date'])); ?></div>
            <?php endif; ?>
        </div>
    </div>

    <div class="client-section">
        <div class="client-box">
            <strong>Emisor:</strong><br>
            <?php echo htmlspecialchars($quote['company_name']); ?><br>
            <?php echo htmlspecialchars($quote['contact_address']); ?><br>
            <?php echo htmlspecialchars($quote['contact_phone']); ?><br>
            <?php echo htmlspecialchars($quote['contact_email']); ?>
        </div>
        <div class="client-box">
            <strong>Cliente:</strong><br>
            <?php echo htmlspecialchars($quote['client_name']); ?><br>
            <?php echo htmlspecialchars($quote['client_address']); ?><br>
            <?php echo htmlspecialchars($quote['client_phone']); ?>
        </div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Descripción</th>
                <th style="text-align: right;">Precio</th>
                <th style="text-align: center;">Cant.</th>
                <th style="text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($items as $item): ?>
            <tr>
                <td><?php echo htmlspecialchars($item['description']); ?></td>
                <td style="text-align: right;"><?php echo $currency . number_format($item['price'], 2); ?></td>
                <td style="text-align: center;"><?php echo $item['quantity']; ?></td>
                <td style="text-align: right;"><?php echo $currency . number_format($item['price'] * $item['quantity'], 2); ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-row">
            <span class="totals-label">Subtotal:</span>
            <span class="totals-value"><?php echo $currency . number_format($quote['subtotal'], 2); ?></span>
        </div>
        <?php if ($quote['discount'] > 0): ?>
        <div class="totals-row">
            <span class="totals-label">Descuento:</span>
            <span class="totals-value">- <?php echo $currency . number_format($quote['discount'], 2); ?></span>
        </div>
        <?php endif; ?>
        <div class="totals-row grand-total">
            <span class="totals-label">Total:</span>
            <span class="totals-value"><?php echo $currency . number_format($quote['total'], 2); ?></span>
        </div>
    </div>

    <?php if (!empty($quote['notes'])): ?>
    <div class="notes">
        <strong>Notas:</strong><br>
        <?php echo nl2br(htmlspecialchars($quote['notes'])); ?>
    </div>
    <?php endif; ?>

    <a href="javascript:window.print()" class="print-btn">🖨️ Imprimir / Guardar PDF</a>

</body>
</html>
<?php
$stmt->close();
$conn->close();
ob_end_flush();
?>