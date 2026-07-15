<style>
html, body { overscroll-behavior: none; }
</style>

<Page className="p-7 flex flex-col items-center gap-6 select-none">
  <Progress
    variant="ring"
    size="lg"
    value={state.remaining}
    max={state.seconds}
    label={state.display}
    color={state.ringColor}/>

  <Badge
    content={state.done ? t.stateDone : (state.running ? t.stateRunning : (state.started ? t.statePaused : t.stateReady))}
    color={state.done ? "success" : (state.running ? "warning" : undefined)}
    icon={state.done ? "check-circle" : (state.running ? "play-circle" : (state.started ? "pause-circle" : "timer"))}/>

  <HStack gap={2} className="items-center">
    <Button label="30s"
      variant="bordered" size="sm"
      pressed={state.preset == "30s"}
      onClick={() => scripts.preset({s: 30, label: "30s"})}/>
    <Button label="1m"
      variant="bordered" size="sm"
      pressed={state.preset == "1m"}
      onClick={() => scripts.preset({s: 60, label: "1m"})}/>
    <Button label="5m"
      variant="bordered" size="sm"
      pressed={state.preset == "5m"}
      onClick={() => scripts.preset({s: 300, label: "5m"})}/>
    <Button label="10m"
      variant="bordered" size="sm"
      pressed={state.preset == "10m"}
      onClick={() => scripts.preset({s: 600, label: "10m"})}/>
  </HStack>

  <HStack gap={4}>
    {state.running ?
      <Button label={t.btnPause}
        icon="pause"
        color="warning" size="lg"
        onClick={() => scripts.toggle()}/>
      :
      <Button label={t.btnStart}
        icon="play"
        color="warning" size="lg"
        onClick={() => scripts.toggle()}/>
    }
    <Button label={t.btnReset}
      icon="arrow-counter-clockwise"
      variant="bordered" size="lg"
      onClick={() => scripts.reset()}/>
  </HStack>
</Page>
