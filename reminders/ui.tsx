<Tray id="main" onClick="popover">
  {/*
    Reminders —— 菜单栏常驻 + 单次提醒。排程完全声明式：见 aglet.json 的 `reminders`
    绑定（items.remind_at_ms → host 在 data-write 后自动 schedule/cancel），scripts 里
    不出现 notifications.*。

    ⚠️ TrayLabel 的服务端 walker（runtime.walkTrayLabel）**只认 Text / Icon**，不支持
    Show/If/DataScope —— 菜单栏内容必须由 scripts 算好写进 state，不能在这里查集合或
    写条件分支。trayText 为空串时 Text 不占位，视觉上只剩铃铛（v2 live view 里 Icon
    与 Text 并排组合，不是互斥兜底）。
  */}
  <TrayLabel>
    {/* ⚠️ Icon 必须包在 HStack 里：runtime.appendTrayIR 会**跳过顶层 Icon**（顶层 Icon
        被当作 title/icon 旧路径的兜底图标，不进组合 IR），只有 top=false 的 Icon 才
        emit 进 label_ir 与 Text 并排。直接平铺 Icon+Text 的结果是只剩数字。 */}
    <HStack gap={4}>
      <Icon symbol="bell" size="sm"/>
      <Text className="text-xs tabular-nums font-normal">{state.trayText}</Text>
    </HStack>
  </TrayLabel>

  <TrayMenu>
    <TrayMenuItem label={t.menuQuit} quit/>
  </TrayMenu>

  <TrayPopover>
    {/* onEnter 重算菜单栏计数：装机后首次开窗、以及从 OS 通知点回来时对齐 */}
    <Page onEnter={() => scripts.refreshTray()}>
      <Tabs id="main" defaultValue="active" position="bottom">
        <Tab value="active" label={t.tabActive} icon="list-checks">
          <Card>
            <DataForm collection="items">
              <Input name="title" label={t.labelTitle} placeholder={t.titlePlaceholder}/>
              <Textarea name="notes" label={t.labelNotes} placeholder={t.notesPlaceholder} rows={2}/>
              {/* mode=datetime → yyyy-MM-ddTHH:mm，且**空值不自动填**（截止时间本就可选）。
                  取代原先让用户按 placeholder 手敲日期格式的 Input。 */}
              <DatePicker name="due_at" label={t.labelDue} mode="datetime"/>
              <HStack justify="end">
                <Button
                  label={t.btnAdd}
                  color="primary"
                  icon="plus"
                  disabled={!form.title}
                  onClick={() => scripts.addReminder()}
                />
              </HStack>
            </DataForm>
          </Card>

          <DataList
            collection="items"
            query={{ where: { completed: false }, orderBy: [{ field: "due_at", direction: "asc" }] }}
          >
            <Empty><EmptyState title={t.emptyActive} icon="check-circle"/></Empty>
            <Item>
              <Card>
                <HStack justify="between" gap={8}>
                  <VStack gap={4} className="flex-1">
                    <Heading level={3}>{item.title}</Heading>
                    {item.notes && <Text muted className="text-sm">{item.notes}</Text>}
                    {item.due_at && (
                      <HStack gap={4} className="items-center">
                        <Badge content={item.due_at | relative} color="warning" icon="clock"/>
                      </HStack>
                    )}
                  </VStack>
                  <Button
                    label={t.btnComplete}
                    icon="check"
                    color="primary"
                    onClick={() => scripts.complete({ id: item.id })}
                  />
                </HStack>
              </Card>
            </Item>
          </DataList>
        </Tab>

        <Tab value="done" label={t.tabDone} icon="check">
          <DataList
            collection="items"
            query={{ where: { completed: true }, orderBy: [{ field: "completed_at", direction: "desc" }] }}
          >
            <Empty><EmptyState title={t.emptyDone} icon="trophy"/></Empty>
            <Item>
              <Card>
                <HStack justify="between" gap={8}>
                  <VStack gap={4} className="flex-1">
                    <HStack gap={4} className="items-center">
                      <Badge content={t.tagCompleted} color="success" icon="check"/>
                      <Text muted className="line-through">{item.title}</Text>
                    </HStack>
                    {item.completed_at && (
                      <Text muted className="text-xs">{item.completed_at | relative}</Text>
                    )}
                  </VStack>
                  <HStack gap={4}>
                    <Button
                      label={t.btnUndo}
                      icon="arrow-counter-clockwise"
                      size="sm"
                      onClick={() => scripts.uncomplete({ id: item.id, due_at: item.due_at })}
                    />
                    <Button
                      label={t.btnDelete}
                      icon="trash"
                      color="danger"
                      size="sm"
                      onClick={() => scripts.remove({ id: item.id })}
                    />
                  </HStack>
                </HStack>
              </Card>
            </Item>
          </DataList>
        </Tab>
      </Tabs>
    </Page>
  </TrayPopover>
</Tray>
