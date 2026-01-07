import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS } from "react-joyride";
import { usePlaybookTour } from "@/hooks/usePlaybookTour";

interface PlaybookTourProps {
  run: boolean;
  stepIndex: number;
  onStepChange: (index: number) => void;
  onFinish: () => void;
}

export function PlaybookTour({ run, stepIndex, onStepChange, onFinish }: PlaybookTourProps) {
  const { steps } = usePlaybookTour();

  const handleCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type as any)) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      onStepChange(nextIndex);
    } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      onFinish();
    }
  };

  return (
    <Joyride
      callback={handleCallback}
      continuous
      run={run}
      stepIndex={stepIndex}
      steps={steps}
      showProgress
      showSkipButton
      disableScrolling={false}
      scrollOffset={100}
      spotlightPadding={8}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Finalizar",
        next: "Próximo",
        open: "Abrir",
        skip: "Pular tour",
      }}
      styles={{
        options: {
          arrowColor: "hsl(var(--card))",
          backgroundColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.6)",
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--card-foreground))",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipTitle: {
          fontSize: "18px",
          fontWeight: 600,
          marginBottom: "8px",
        },
        tooltipContent: {
          fontSize: "14px",
          lineHeight: "1.6",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 500,
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "10px",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "13px",
        },
        spotlight: {
          borderRadius: "12px",
        },
        beacon: {
          display: "none",
        },
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}
