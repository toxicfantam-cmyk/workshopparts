export const exportToCSV = (data, filename = 'report.csv') => {
  if (!data || !data.length) {
    alert('No data available to export');
    return;
  }

  // Get keys
  const headers = Object.keys(data[0]);

  // Construct CSV string
  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map((header) => {
      let val = row[header];
      if (val === null || val === undefined) {
        return '""';
      }
      if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      const stringified = `${val}`.replace(/"/g, '""');
      return `"${stringified}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
