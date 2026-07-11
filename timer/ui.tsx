<style>
html, body { overscroll-behavior: none; }
</style>

<Page className="min-h-screen p-6 flex flex-col items-center justify-center select-none">
<VStack gap={2} className="items-center mb-10">
    <Heading
      level={1}
      content={state.display}
      className="text-8xl font-light tabular-nums tracking-tight"/>
    <HStack gap={3} className="items-center mt-2">
      <Badge
        content={state.done ? t.stateDone : (state.running ? t.stateRunning : t.statePaused)}
        color={state.done ? "warning" : (state.running ? "success" : undefined)}
        icon={state.done ? "check-circle" : (state.running ? "play-circle" : "pause-circle")}/>
      <Text muted className="text-xs uppercase tracking-wider">{state.preset}</Text>
    </HStack>
  </VStack>

<HStack gap={3} className="mb-10">
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
