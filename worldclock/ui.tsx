<Tray id="main" onClick="popover">
  <TrayLabel>
    {/* 有勾选的时钟 → 显时间文本;一个都没勾 → 显时钟图标(不留空) */}
    <Show when={{ op: "state", path: "/state/menubarText" }}>
      <Text className="text-xs tabular-nums font-normal">{state.menubarText}</Text>
      <Fallback>
        <Icon symbol="clock" size="lg"/>
      </Fallback>
    </Show>
  </TrayLabel>

  <TrayMenu>
    <TrayMenuItem label={t.menuQuit} quit/>
  </TrayMenu>

  <TrayPopover>
    <Page onEnter={() => scripts.refresh()}>
      {/* 状态驱动:managing=true 显管理页,否则主视图。Show/Fallback 每分支只收单个子 → 各包一层 VStack */}
      <Show when={{ op: "state", path: "/state/_ui/managing" }}>
        {/* ── 管理页 ── */}
        <VStack gap={0}>
          <HStack align="center" className="px-2 pt-2 pb-1">
            <Button icon="chevron-left" label={t.manageTitle} variant="light" size="sm"
              onClick={() => scripts.closeManage()}/>
          </HStack>
          <DataList collection="cities" query={{orderBy: [{field: "order", direction: "asc"}]}}>
            <Item>
              <HStack gap={2} align="center" className="px-4 py-2">
                <VStack gap={0} className="flex-1">
                  <Text className="text-sm font-medium">{t(item.key)}</Text>
                  <Text className="text-[10px] tabular-nums opacity-45">{item.code} · {$now({offset: item.gmtoff, format: "time", hour12: item.h12})}</Text>
                </VStack>
                <Button icon={item.star} variant="light" size="sm"
                  onClick={() => scripts.toggleMenubar({ id: item.id, on: item.menubar })}/>
                <Button icon="trash" variant="light" size="sm" className="opacity-60"
                  onClick={() => app.confirm({
                    title: t(item.key),
                    description: t.removePrompt,
                    confirmLabel: t.removeCity,
                    cancelLabel: t.cancel,
                    color: "danger",
                    onConfirm: () => scripts.removeCity({ id: item.id })
                  })}/>
              </HStack>
            </Item>
            <Empty>
              <VStack align="center" gap={1} className="py-10">
                <Text className="text-[11px] opacity-45">{t.empty}</Text>
              </VStack>
            </Empty>
          </DataList>
          <Divider/>
          <HStack justify="center" className="px-4 py-1.5">
            <Button label={t.addButton} icon="plus" variant="light" size="sm"
              onClick={() => scripts.openAdd()}/>
          </HStack>
        </VStack>

        <Fallback>
          {/* ── 主视图:极简只读时钟列表(零按钮,macOS 质感) ── */}
          <VStack gap={0}>
            <DataList collection="cities" query={{orderBy: [{field: "order", direction: "asc"}]}}>
              <Item>
                <HStack gap={3} align="center" className="px-4 py-2.5">
                  <Icon symbol={item.dn} color={item.dnColor} size="sm"/>
                  <VStack gap={0} className="flex-1">
                    <Text className="text-sm font-medium">{t(item.key)}</Text>
                    <Text className="text-xs tabular-nums opacity-45">{$now({offset: item.gmtoff, format: "date"})}{item.diffLabel}</Text>
                  </VStack>
                  {/* 已在菜单栏显示 → 蓝色对勾(正向 item 守卫) */}
                  {item.menubar && <Icon symbol="check" color="#0a84ff" size="sm"/>}
                  <Text className="text-xl tabular-nums font-normal">{$now({offset: item.gmtoff, format: "time", hour12: item.h12})}</Text>
                </HStack>
              </Item>
              <Empty>
                <VStack align="center" gap={1} className="py-10">
                  <Text className="text-[11px] opacity-45">{t.empty}</Text>
                </VStack>
              </Empty>
            </DataList>
            <Divider/>
            <HStack justify="center" className="px-4 py-1.5">
              <Button label={t.manage} icon="gear" variant="light" size="sm"
                onClick={() => scripts.openManage()}/>
            </HStack>
          </VStack>
        </Fallback>
      </Show>

      {/* 新建城市 —— 状态驱动抽屉(无标题/关闭按钮,只留 grabber)。native Select 是固有宽度、
          撑不满,故用一行 justify-between:左选城市、右加按钮。 */}
      <Drawer id="add" side="bottom" className="absolute">
        <HStack justify="between" align="center" gap={3}>
          <Select bind="/state/draft/tz" collection="catalog" optionValue="tz" optionLabel="name"
            placeholder={t.selectCity}/>
          <Button label={t.add} icon="plus" color="primary" onClick={() => scripts.addCity()}/>
        </HStack>
      </Drawer>

    </Page>
  </TrayPopover>
</Tray>
