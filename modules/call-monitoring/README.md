# Call Monitoring Module

## Overview
This module adds an isolated Cisco Webex Contact Center monitoring experience to the existing Next.js application without changing authentication or the dynamic menu APIs.

## Structure
- `modules/call-monitoring/services/webexService.js`
- `modules/call-monitoring/services/callMonitoringService.js`
- `modules/call-monitoring/services/authService.js`
- `modules/call-monitoring/components/*`
- `modules/call-monitoring/pages/*`

## Frontend routes
- `/call-monitoring`
- legacy paths redirect into the tabbed page:
- `/call-monitoring/live-calls`
- `/call-monitoring/agents`
- `/call-monitoring/recordings`
- `/call-monitoring/analytics`

## API routes
- `GET /api/call-monitoring/live-calls`
- `GET /api/call-monitoring/agents`
- `GET /api/call-monitoring/calls/:callId`
- `GET /api/call-monitoring/recordings`
- `GET /api/call-monitoring/analytics`

## WXCC Desktop Widget Testing

To test real supervisor monitoring audio on a local machine, the module must run inside Webex Contact Center Desktop as an iFrame widget.

Files:
- `app/call-monitoring-widget/page.jsx`
- `modules/call-monitoring/widget/desktop-layout.json`

Required environment variables:
- `CALL_MONITORING_WIDGET_KEY=your-shared-widget-key`
- `NEXT_PUBLIC_CALL_MONITORING_WIDGET_KEY=your-shared-widget-key`

Notes:
- Use an HTTPS URL for the widget source. `http://localhost:3000` cannot be embedded safely inside `https://desktop.wxcc-us1.cisco.com`.
- For local testing, expose your app over HTTPS using a tunnel or local HTTPS proxy, then replace `https://YOUR-HTTPS-HOST/call-monitoring-widget` in the desktop layout JSON.
- The widget route adds CSP `frame-ancestors 'self' https://*.cisco.com;` so WXCC Desktop can embed it.
- Call-monitoring API routes accept the widget key header only for this module, so the embedded widget can load local data without the normal browser-tab session cookie.

## Notes
- Webex access is server-side only through `process.env.WEBEX_ACCESS_TOKEN`
- The module uses polling on the client for real-time refresh
- The sidebar entry is a single static UI link and does not change the existing dynamic menu backend
- Existing auth/session continues to protect pages and API access
