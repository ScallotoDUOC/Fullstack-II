<?php
$pageTitle = 'Gestión de reservas';
require_once __DIR__ . '/includes/header.php';

$pdo = db();
$mensaje = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        verifyCsrf();
        $id = (int)($_POST['id'] ?? 0);
        $estado = (string)($_POST['estado_reserva'] ?? 'pendiente');
        $pago = (string)($_POST['estado_pago'] ?? 'pendiente');

        $estadosReserva = ['pendiente','confirmada','en_preparacion','entregada','finalizada','cancelada'];
        $estadosPago = ['pendiente','pagado','rechazado','reembolsado'];
        if (!in_array($estado, $estadosReserva, true) || !in_array($pago, $estadosPago, true)) {
            throw new RuntimeException('Estado no válido.');
        }

        $stmt = $pdo->prepare('UPDATE reservas SET estado_reserva=?, estado_pago=? WHERE id=?');
        $stmt->execute([$estado, $pago, $id]);
        $mensaje = 'Reserva actualizada correctamente.';
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

$reservas = $pdo->query("SELECT r.*, u.nombre AS cliente, u.email AS email_cliente, COUNT(rd.id) AS items FROM reservas r JOIN usuarios u ON u.id=r.usuario_id LEFT JOIN reserva_detalle rd ON rd.reserva_id=r.id GROUP BY r.id ORDER BY r.fecha_evento DESC, r.id DESC")->fetchAll();
?>

<?php if ($mensaje): ?><div class="alert alert-success"><i class="bi bi-check-circle me-2"></i><?= htmlspecialchars($mensaje) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="panel-card">
  <div class="panel-heading"><div><h2 class="h5 fw-bold mb-1">Reservas</h2><p class="text-secondary small mb-0">HU-064, HU-065 y HU-068.</p></div><span class="badge bg-dark rounded-pill"><?= count($reservas) ?> reservas</span></div>
  <div class="table-responsive">
    <table class="table admin-table align-middle">
      <thead><tr><th>Reserva</th><th>Cliente</th><th>Evento</th><th>Items</th><th>Total</th><th>Pago</th><th>Reserva</th><th>Acción</th></tr></thead>
      <tbody>
      <?php foreach ($reservas as $r): ?>
        <tr>
          <td><strong>#<?= (int)$r['id'] ?></strong></td>
          <td><?= htmlspecialchars($r['cliente']) ?><small class="d-block text-secondary"><?= htmlspecialchars($r['email_cliente']) ?></small></td>
          <td><?= htmlspecialchars(date('d-m-Y', strtotime($r['fecha_evento']))) ?><small class="d-block text-secondary"><?= htmlspecialchars($r['comuna']) ?></small></td>
          <td><?= (int)$r['items'] ?></td>
          <td><strong>$<?= number_format((float)$r['total'],0,',','.') ?></strong></td>
          <td><span class="badge-soft <?= $r['estado_pago'] === 'pagado' ? 'success' : ($r['estado_pago'] === 'rechazado' ? 'danger' : 'warning') ?>"><?= htmlspecialchars($r['estado_pago']) ?></span></td>
          <td><span class="badge-soft info"><?= htmlspecialchars($r['estado_reserva']) ?></span></td>
          <td>
            <form method="post" class="d-flex flex-column gap-1" style="min-width:170px">
              <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrfToken()) ?>">
              <input type="hidden" name="id" value="<?= (int)$r['id'] ?>">
              <select name="estado_reserva" class="form-select form-select-sm">
                <?php foreach (['pendiente','confirmada','en_preparacion','entregada','finalizada','cancelada'] as $estado): ?><option value="<?= $estado ?>" <?= $r['estado_reserva'] === $estado ? 'selected' : '' ?>><?= $estado ?></option><?php endforeach; ?>
              </select>
              <select name="estado_pago" class="form-select form-select-sm">
                <?php foreach (['pendiente','pagado','rechazado','reembolsado'] as $pago): ?><option value="<?= $pago ?>" <?= $r['estado_pago'] === $pago ? 'selected' : '' ?>>Pago: <?= $pago ?></option><?php endforeach; ?>
              </select>
              <button class="btn btn-sm btn-dark">Guardar</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
