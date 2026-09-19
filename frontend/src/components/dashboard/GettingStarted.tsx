const GettingStarted = () => {

    const tips = [
      "Build an emergency fund covering 3-6 months of expenses",
      "Automate monthly savings",
      "Start investing early to benefit from compounding",
      "Diversify your investments"
    ];
  
    return (
  
      <div className="bg-card rounded-lg p-5 border">
  
        <h3 className="font-semibold text-lg mb-3">
          Getting Started Tips
        </h3>
  
        <ul className="space-y-2 text-sm text-muted-foreground">
  
          {tips.map((tip, i) => (
            <li key={i}>• {tip}</li>
          ))}
  
        </ul>
  
      </div>
  
    );
  
  };
  
  export default GettingStarted;