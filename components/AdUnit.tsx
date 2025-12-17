export default function AdUnit({ slot, format = 'auto' }: { slot: string, format?: string }) {
    return (
        <div style={{
            background: '#f0f0f0',
            border: '1px dashed #ccc',
            padding: '20px',
            textAlign: 'center',
            margin: '20px 0',
            minHeight: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888'
        }}>
            <p>AdSense Placeholder (Slot: {slot})</p>
            {/* In production, this would be the ins tag:
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-XXXXXXXXXXXX"
           data-ad-slot={slot}
           data-ad-format={format}
           data-full-width-responsive="true"></ins>
      */}
        </div>
    );
}
