node -e "
const ExcelJS = require('exceljs');
const wb = new ExcelJS.Workbook();
wb.xlsx.readFile('C:/AllianzInsurance-Automation/test-data/forms-fixture.xlsx').then(() => {
  console.log('Total worksheets:', wb.worksheets.length);
  wb.worksheets.forEach((ws, i) => {
    console.log('  Sheet', i, ':', JSON.stringify(ws.name), '| rows:', ws.rowCount, '| cols:', ws.columnCount);
    const row1 = ws.getRow(1);
    const headers = [];
    row1.eachCell((cell) => headers.push(cell.value));
    console.log('  Header row:', headers.slice(0, 5));
  });
}).catch(e => console.error('ExcelJS error:', e.message));
"

# Check if it's really .xlsx (should start with PK)
powershell -c "(Get-Content 'C:\AllianzInsurance-Automation\test-data\forms-fixture.xlsx' -Encoding Byte -TotalCount 4) -join ','"


npm install exceljs@4.4.0
