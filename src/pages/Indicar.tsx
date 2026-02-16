import { useEffect } from "react";

export default function Indicar() {
  useEffect(() => {
    window.location.href = "https://indicar.amorauxiliomaternidade.com.br";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Redirecionando...</p>
    </div>
  );
}
