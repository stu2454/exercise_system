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
      <p className="client-demo-lead">Follow nine exercise videos while the camera tracks your movement.</p>
      <p className="client-demo-privacy">Camera images and movement processing stay on this device.</p>
      <p className="client-demo-disclaimer">Demonstration only — not a medical assessment or treatment.</p>
      <button className="participant-primary-action" type="button" onClick={onStart}>GET STARTED</button>
    </main>
  );
}
