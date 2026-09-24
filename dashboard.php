<?php
$pageTitle = 'Dashboard';
require_once __DIR__ . '/includes/header.php';

$pdo = db();

$clientes = (int)$pdo->query("SELECT COUNT(*) FROM usuarios WHERE estado = 'activo'")->fetchColumn();
$juegos = (int)$pdo->query("SELECT COUNT(*) FROM juegos WHERE activo = 1")->fetchColumn();
$reservasHoy = (int)$pdo->query("SELECT COUNT(*) FROM reservas WHERE fecha_evento = CURDATE() AND estado_reserva <> 'cancelada'")->fetchColumn();
$ingresos = (float)$pdo->query("SELECT COALESCE(SUM(total),0) FROM reservas WHERE estado_pago = 'pagado' AND estado_reserva <> 'cancelada'")->fetchColumn();

$ultimas = $pdo->query("SELECT r.id, r.fecha_evento, r.total, r.estado_reserva, r.estado_pago, u.nombre AS cliente FROM reservas r JOIN usuarios u ON u.id = r.usuario_id ORDER BY r.id DESC LIMIT 5")->fetchAll();
$topJuegos = $pdo->query("SELECT j.nombre, COALESCE(SUM(rd.horas),0) AS horas, COALESCE(SUM(rd.cantidad),0) AS unidades FROM reserva_detalle rd JOIN juegos j ON j.id = rd.juego_id GROUP BY j.id, j.nombre ORDER BY unidades DESC, horas DESC LIMIT 5")->fetchAll();
?>
<div class="row g-4 mb-4">
  <div class="col-md-6 col-xl-3"><div class="stat-card"><div><span>Clientes activos</span><strong><?= number_format($clientes) ?></strong></div><div class="stat-icon"><i class="bi bi-people"></i></div></div></div>
  <div class="col-md-6 col-xl-3"><div class="stat-card"><div><span>Juegos activos</span><strong><?= number_format($juegos) ?></strong></div><div class="stat-icon"><i class="bi bi-controller"></i></div></div></div>
  <div class="col-md-6 col-xl-3"><div class="stat-card"><div><span>Reservas de hoy</span><strong><?= number_format($reservasHoy) ?></strong></div><div class="stat-icon"><i class="bi bi-calendar-event"></i></div></div></div>
  <div class="col-md-6 col-xl-3"><div class="stat-card"><div><span>Ingresos registrados</span><strong>$<?= number_format($ingresos, 0, ',', '.') ?></strong></div><div class="stat-icon"><i class="bi bi-cash-coin"></i></div></div></div>
</div>

<div class="row g-4">
  <div class="col-lg-7">
    <div class="panel-card h-100">
      <div class="panel-heading"><div><h2 class="h5 fw-bold mb-1">Últimas reservas</h2><p class="text-secondary small mb-0">Vista rápida de la operación.</p></div><a href="reservas.php" class="btn btn-sm btn-outline-dark rounded-pill">Ver todas</a></div>
      <div class="table-responsive">
        <table class="table admin-table align-middle mb-0">
          <thead><tr><th>ID</th><th>Cliente</th><th>Fecha</th><th>Pago</th><th>Estado</th></tr></thead>
          <tbody>
          <?php foreach ($ultimas as $r): ?>
            <tr>
              <td>#<?= (int)$r['id'] ?></td>
              <td><?= htmlspecialchars($r['cliente']) ?></td>
              <td><?= htmlspecialchars(date('d-m-Y', strtotime($r['fecha_evento']))) ?></td>
              <td><span class="badge-soft <?= $r['estado_pago'] === 'pagado' ? 'success' : 'warning' ?>"><?= htmlspecialchars($r['estado_pago']) ?></span></td>
              <td><span class="badge-soft info"><?= htmlspecialchars($r['estado_reserva']) ?></span></td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="col-lg-5">
    <div class="panel-card h-100">
      <div class="panel-heading"><div><h2 class="h5 fw-bold mb-1">Juegos más arrendados</h2><p class="text-secondary small mb-0">Datos acumulados de reservas.</p></div><a href="juegos.php" class="btn btn-sm btn-outline-dark rounded-pill">Gestionar</a></div>
      <div class="top-game-list">
      <?php foreach ($topJuegos as $index => $j): ?>
        <div class="top-game"><span class="rank"><?= $index + 1 ?></span><div class="flex-grow-1"><strong><?= htmlspecialchars($j['nombre']) ?></strong><small><?= (int)$j['unidades'] ?> reserva(s) · <?= (int)$j['horas'] ?> hora(s)</small></div></div>
      <?php endforeach; ?>
      </div>
    </div>
  </div>
</div>

<div class="panel-card mt-4">
  <div class="panel-heading"><div><h2 class="h5 fw-bold mb-1">Qué cubre este panel</h2><p class="text-secondary small mb-0">La implementación está basada en las historias administrativas de tu plantilla Scrum.</p></div></div>
  <div class="row g-3 small">
    <div class="col-md-6 col-xl-3"><div class="feature-box"><i class="bi bi-controller"></i><strong>Catálogo</strong><span>Crear, editar, activar y desactivar juegos.</span></div></div>
    <div class="col-md-6 col-xl-3"><div class="feature-box"><i class="bi bi-calendar-check"></i><strong>Reservas</strong><span>Revisar y cambiar estado de reservas y pagos.</span></div></div>
    <div class="col-md-6 col-xl-3"><div class="feature-box"><i class="bi bi-people"></i><strong>Usuarios</strong><span>Consultar clientes y bloquear/desbloquear cuentas.</span></div></div>
    <div class="col-md-6 col-xl-3"><div class="feature-box"><i class="bi bi-bar-chart"></i><strong>Indicadores</strong><span>Ver ingresos y juegos más arrendados.</span></div></div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
