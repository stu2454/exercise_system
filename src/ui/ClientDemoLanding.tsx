interface ClientDemoLandingProps {
  exerciseCount: number;
  onStart: () => void;
}

export function ClientDemoLanding({ exerciseCount, onStart }: ClientDemoLandingProps) {
  return (
    <main className="client-demo-landing">
      <p className="eyebrow">Prototype demonstration</p>
      <h1>Exercise Programme Demo</h1>
      <p className="client-demo-landing__count">{exerciseCount} exercises</p>
      <p>This prototype uses your device&apos;s camera to track your movement while you follow a series of exercise demonstrations.</p>
      <p className="client-demo-privacy">Camera images and movement processing remain on your device during this demonstration.</p>
      <p className="client-demo-disclaimer">This is a demonstration system and is not a medical assessment or treatment tool.</p>
      <button className="participant-primary-action" type="button" onClick={onStart}>GET STARTED</button>
    </main>
  );
}
