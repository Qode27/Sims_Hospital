type PrintFooterProps = {
  note?: string | null;
  signatureLabel?: string;
};

export const PrintFooter = ({ note, signatureLabel = "Authorized Signature" }: PrintFooterProps) => {
  return (
    <footer className="invoice-sheet__footer">
      <p>{note || "Thank you for choosing our hospital services."}</p>
      <div className="invoice-sheet__signature">
        <div className="invoice-sheet__signature-line" />
        <p>{signatureLabel}</p>
      </div>
    </footer>
  );
};
