interface ClientDemoLandingProps {
  exerciseCount: number;
  onStart: () => void;
}

export function ClientDemoLanding({ exerciseCount, onStart }: ClientDemoLandingProps) {
  return (
    <main className="client-demo-landing">
      <p className="eyebrow">Prototype demonstration</p>
      <h1>Exercise Programme</h1>
      <p className="client-demo-landing__count">{exerciseCount} exercises</p>
      <p>Follow the demonstration and perform each exercise in front of the camera.</p>
      <p className="client-demo-privacy">Camera processing occurs in your browser for this demonstration.</p>
      <button className="participant-primary-action" type="button" onClick={onStart}>START PROGRAMME</button>
    </main>
  );
}
