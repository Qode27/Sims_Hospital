type PrintTableProps = {
  headers: string[];
  rows: Array<Array<string>>;
};

export const PrintTable = ({ headers, rows }: PrintTableProps) => {
  return (
    <section className="invoice-sheet__table-wrap">
      <table className="invoice-sheet__table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className={header.toLowerCase().includes("amount") ? "text-right" : undefined}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.join("-")}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className={cellIndex === row.length - 1 ? "text-right font-semibold" : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
