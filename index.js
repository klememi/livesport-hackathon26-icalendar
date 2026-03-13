const express = require('express');
const app = express();

app.use(express.json());

function formatICalText(text) {
  // RFC 5545: lines must be folded at 75 octets, continuation lines start with space
  const lines = [];
  const maxLen = 75;
  let remaining = text;
  while (remaining.length > maxLen) {
    lines.push(remaining.slice(0, maxLen));
    remaining = ' ' + remaining.slice(maxLen);
  }
  lines.push(remaining);
  return lines.join('\r\n');
}

function getCurrentTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function generateICalendar(calendarData) {
  const now = getCurrentTimestamp();
  const lines = [
    'BEGIN:VCALENDAR',
    'METHOD:PUBLISH',
    'PRODID:-//FLASHSCORE//FLASHSCORE 1.0//EN',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'VERSION:2.0',
    'X-PUBLISHED-TTL:PT6H',
    formatICalText(`X-WR-CALDESC:${calendarData.description}`),
    formatICalText(`X-WR-CALNAME:${calendarData.name}`),
    'X-WR-TIMEZONE:UTC',
  ];

  for (const event of calendarData.events) {
    lines.push(
      'BEGIN:VEVENT',
      'CLASS:PUBLIC',
      formatICalText(`DESCRIPTION:${event.description}`),
      `DTEND:${event.endTime}`,
      `DTSTAMP:${now}`,
      `DTSTART:${event.startTime}`,
      `LAST-MODIFIED:${now}`,
      'SEQUENCE:0',
      formatICalText(`SUMMARY:${event.summary}`),
      'TRANSP:TRANSPARENT',
      `UID:${event.uid}`,
      formatICalText(`URL:${event.url}`),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      formatICalText(`DESCRIPTION:${event.alarmDescription}`),
      formatICalText(`SUMMARY:${event.alarmSummary}`),
      'TRIGGER:-PT15M',
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

app.post('/calendar', (req, res) => {
  const calendarData = req.body;

  if (!calendarData || !calendarData.name || !Array.isArray(calendarData.events)) {
    return res.status(400).json({ error: 'Invalid CalendarData: must have name, description, and events array' });
  }

  const ical = generateICalendar(calendarData);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${calendarData.name}.ics"`);
  res.send(ical);
});

app.get('/', (req, res) => {
  res.json({
    usage: 'POST /calendar with CalendarData JSON body',
    schema: {
      name: 'string',
      description: 'string',
      events: [{
        uid: 'string',
        summary: 'string',
        description: 'string',
        url: 'string',
        startTime: 'string (e.g. 20250718T153000Z)',
        endTime: 'string (e.g. 20250718T171500Z)',
        alarmSummary: 'string',
        alarmDescription: 'string',
      }],
    },
  });
});

// Local dev
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`iCalendar server running on port ${PORT}`));
}

module.exports = app;
