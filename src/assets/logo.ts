export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" rx="96" fill="#0d0d0f"/>

  <!-- Board body -->
  <rect x="72" y="196" width="368" height="272" rx="16" fill="#1e1e24"/>

  <!-- Script lines on board -->
  <rect x="108" y="256" width="148" height="13" rx="4" fill="#2a2a32"/>
  <rect x="108" y="283" width="108" height="13" rx="4" fill="#2a2a32"/>
  <rect x="108" y="310" width="188" height="13" rx="4" fill="#2a2a32"/>
  <rect x="108" y="337" width="128" height="13" rx="4" fill="#2a2a32"/>

  <!-- Play triangle (right side) -->
  <polygon points="308,256 308,368 412,312" fill="#e85d3a"/>

  <!-- Fixed clapper slate -->
  <rect x="72" y="136" width="368" height="64" rx="12" fill="#e85d3a"/>

  <!-- Diagonal stripes on slate -->
  <clipPath id="cl"><rect x="72" y="136" width="368" height="64" rx="12"/></clipPath>
  <g clip-path="url(#cl)" fill="#0d0d0f" opacity="0.30">
    <polygon points="72,136 132,136 72,200"/>
    <polygon points="148,136 208,136 88,200 72,200"/>
    <polygon points="224,136 284,136 164,200 104,200"/>
    <polygon points="300,136 360,136 240,200 180,200"/>
    <polygon points="376,136 440,136 316,200 256,200"/>
  </g>

  <!-- Clapper arm (open/raised, -10 deg around hinge) -->
  <rect x="106" y="100" width="260" height="40" rx="10" fill="#c44d26"
        transform="rotate(-10 106 136)"/>

  <!-- Hinge -->
  <circle cx="106" cy="136" r="14" fill="#0d0d0f"/>
  <circle cx="106" cy="136" r="6" fill="#ff7a56"/>
</svg>`;
