import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const ValidateRedirect = () => {
  const { serial } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (serial) {
      navigate(`/cadastro?code=${serial}`, { replace: true });
    } else {
      navigate("/cadastro", { replace: true });
    }
  }, [serial, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
};

export default ValidateRedirect;
