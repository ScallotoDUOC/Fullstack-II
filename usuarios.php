<?php
$pageTitle = 'Gestión de usuarios';
require_once __DIR__ . '/includes/header.php';

$pdo = db();
$mensaje = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $id = (int)($_POST['id'] ?? 0);
    $stmt = $pdo->prepare("UPDATE usuarios SET estado = IF(estado='activo','bloqueado','activo') WHERE id = ?");
    $stmt->execute([$id]);
    $mensaje = 'Estado de usuario actualizado.';
}

$usuarios = $pdo->query('SELECT id, nombre, email, telefono, direccion, estado, created_at FROM usuarios ORDER BY id DESC')->fetchAll();
?>

<?php if ($mensaje): ?><div class="alert alert-success"><i class="bi bi-check-circle me-2"></i><?= htmlspecialchars($mensaje) ?></div><?php endif; ?>
<div class="panel-card">
  <div class="panel-heading"><div><h2 class="h5 fw-bold mb-1">Clientes registrados</h2><p class="text-secondary small mb-0">HU-066 y HU-067.</p></div><span class="badge bg-dark rounded-pill"><?= count($usuarios) ?> usuarios</span></div>
  <div class="table-responsive">
    <table class="table admin-table align-middle">
      <thead><tr><th>Cliente</th><th>Contacto</th><th>Dirección</th><th>Registro</th><th>Estado</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($usuarios as $u): ?>
        <tr>
          <td><strong><?= htmlspecialchars($u['nombre']) ?></strong><small class="d-block text-secondary">ID #<?= (int)$u['id'] ?></small></td>
          <td><?= htmlspecialchars($u['email']) ?><small class="d-block text-secondary"><?= htmlspecialchars($u['telefono'] ?: 'Sin teléfono') ?></small></td>
          <td><?= htmlspecialchars($u['direccion'] ?: 'Sin dirección') ?></td>
          <td><?= htmlspecialchars(date('d-m-Y', strtotime($u['created_at']))) ?></td>
          <td><span class="badge-soft <?= $u['estado'] === 'activo' ? 'success' : 'danger' ?>"><?= htmlspecialchars($u['estado']) ?></span></td>
          <td><form method="post"><input type="hidden" name="csrf" value="<?= htmlspecialchars(csrfToken()) ?>"><input type="hidden" name="id" value="<?= (int)$u['id'] ?>"><button class="btn btn-sm btn-outline-dark" title="Cambiar estado"><i class="bi bi-person-lock"></i></button></form></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
