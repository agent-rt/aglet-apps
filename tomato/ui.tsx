<Tray id="main" onClick="popover">
  <TrayLabel>
    <Text className="text-xs tabular-nums font-medium">{state.trayText}</Text>
  </TrayLabel>

  <TrayMenu>
    <TrayMenuItem label={t.menuStartPause} onSelect="toggle"/>
    <TrayMenuItem label={t.menuSkip} onSelect="skip"/>
    <TrayMenuItem label={t.menuReset} onSelect="reset"/>
    <TrayMenuItem label={t.menuQuit} quit/>
  </TrayMenu>

  <TrayPopover>
    <Page>
      <VStack className="p-4 gap-3 items-center">

        <Text className="text-sm font-medium" color="secondary" content={state.phaseLabel}/>

        {/* 大倒计时 */}
        <Text className="text-5xl font-bold tabular-nums" content={state.display}/>

        {/* 进度点:已完成的专注数(0-4) */}
        <HStack className="gap-1">
          <For each={[1, 2, 3, 4]}>
            <Text className="text-xs" content={item}/>
          </For>
        </HStack>

        {/* 主控:运行中显暂停,否则开始/继续 */}
        <HStack className="gap-2 w-full">
          {state.isRunning
            ? <Button label={t.pause} variant="flat" color="#ef4444" className="flex-1 w-full"
                leftIcon="pause" onClick={() => scripts.pause()}/>
            : <Button label={t.start} variant="flat" color="#ef4444" className="flex-1 w-full"
                leftIcon="play" onClick={() => scripts.start()}/>}
        </HStack>

        <HStack className="gap-2 w-full">
          <Button label={t.skip} variant="bordered" size="sm" className="flex-1 w-full"
            onClick={() => scripts.skip()}/>
          <Button label={t.reset} variant="ghost" size="sm" className="flex-1 w-full"
            onClick={() => scripts.reset()}/>
        </HStack>

      </VStack>
    </Page>
  </TrayPopover>
</Tray>
