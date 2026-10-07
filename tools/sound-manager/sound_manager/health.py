"""Observable device/stream states; never infer acoustic playback from samples."""
import time
def stream_state(window, identifier, kind):
    device = next((d for d in window.devices if d.id == identifier and d.kind==kind), None)
    config = window.settings.output(identifier) if kind=='output' else window.settings.input(identifier)
    workers = window.engine.workers if kind=='output' else window.engine.inputs
    worker = workers.get(identifier)
    if device is None:
        return 'Disconnected'
    if worker and worker.error:
        return 'Failed'
    if not window.running:
        return 'Connected · routing stopped'
    enabled = window.selected(device) if kind=='output' else config['monitor'] or config['meter']
    if not enabled:
        return 'Connected · not selected' if kind=='output' else 'Connected · capture off'
    if window.mutes.active(kind) or device.muted:
        return 'Muted'
    if getattr(window, 'solo_id', None) and kind=='output' and identifier != window.solo_id:
        return 'Solo suppressed'
    return 'Processing' if worker and worker.is_alive() else 'Waiting'

def report(window):
    lines = [f'Routing: {"running" if window.running else "stopped"}',
             f'System source peak: {window.engine.peak:.5f} (samples, not acoustic level)']
    if not window.running:
        lines.append('Start sound to route system audio; native volume/mute still work.')
    elif window.engine.peak < 1e-6:
        lines.append('No source signal detected now. Check app playback and its chosen output; exclusive audio can bypass the manager.')
    if window.engine.error:
        lines.append('Source capture failed: '+window.engine.error)
    if window.mutes.active('output'):
        lines.append('Panic mute is active. Restore outputs to hear routed audio.')
    if getattr(window,'solo_id',None):
        lines.append('Solo is active; other routed outputs are temporarily silent.')
    if time.monotonic() < getattr(window.engine,'test_click_end',0):
        lines.append('Synchronization test clicks may be active; they are generated here, not source audio.')
    known = {(d.id,d.kind):d.name for d in window.devices}
    for kind,bucket in (('output','outputs'),('input','inputs')):
        for identifier in window.settings.data[bucket]:
            state = stream_state(window,identifier,kind)
            worker = (window.engine.workers if kind=='output' else window.engine.inputs).get(identifier)
            lines.append(f'\n{kind.title()} · {known.get((identifier,kind),identifier)}: {state}')
            if worker:
                lines.append(f'Queue drops: {getattr(worker,"drops",0)} · processing: {getattr(worker,"process_ms",0):.3f} ms/block')
                if worker.latency_ms is not None:
                    lines.append(f'Driver latency: {worker.latency_ms:.2f} ms; configured delay: {worker.config.get("delay_ms",0)} ms')
                if worker.error:
                    lines.append('Reported error: '+worker.error+' · Retry selected attempts recovery once; reconnect missing hardware first.')
    lines.append('\nDriver latency is an estimate. Bluetooth codec/acoustic delay may require manual adjustment. Processing time is wall time for DSP, not total CPU utilization.')
    return '\n'.join(lines)
