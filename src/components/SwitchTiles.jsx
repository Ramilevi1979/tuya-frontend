import { deviceName, iconFor, switchChannels } from '../lib/devices';

export default function SwitchTiles({ devices, onToggle }) {
  const tiles = devices.flatMap((device) => {
    const channels = switchChannels(device);
    return channels.map((channel, i) => ({ device, channel, index: i, total: channels.length }));
  });

  return (
    <div className="tiles">
      {tiles.map(({ device, channel, index, total }) => {
        const Icon = iconFor(device);
        const on = channel.value;
        const offline = !device.online;
        const name = total > 1 ? `${deviceName(device)} ${index + 1}` : deviceName(device);
        return (
          <button
            type="button"
            key={`${device.id}:${channel.code}`}
            className="tile"
            aria-pressed={on}
            disabled={offline}
            onClick={() => onToggle(device.id, channel.code, !on)}
          >
            <span className="tile-top">
              <Icon size={22} />
              <span className="pilot" />
            </span>
            <span>
              <span className="tile-name">{name}</span>
              <span className="tile-state">{offline ? 'לא מחובר' : on ? 'דלוק' : 'כבוי'}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
