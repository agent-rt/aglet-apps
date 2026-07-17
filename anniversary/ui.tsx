<Page onEnter={() => scripts.refresh()}>
  <VStack className="p-5 gap-4">
    {/* HERO —— 最近一个纪念日 */}
    <DataList collection="events" query={{ orderBy: [{ field: "days_until", direction: "asc" }], limit: 1 }}>
      <Empty>
        <VStack className="items-center gap-2 py-16">
          <EmptyState title={t.empty} description={t.emptyHint} icon="calendar"/>
        </VStack>
      </Empty>
      <Item>
        <Card className="bg-gradient-to-br from-[#ff8a6b] to-[#ff5e8a] text-[#2a0f18] rounded-3xl p-5">
          <Text className="text-xs uppercase tracking-widest opacity-70">{t.next}</Text>
          <HStack justify="between" className="items-end mt-2">
            <VStack gap={1}>
              <Heading level={2}>{item.title}</Heading>
              <Text className="text-sm opacity-80">{item.next_at} · {item.milestone}</Text>
              {item.note && <Text className="text-sm opacity-70">{item.note}</Text>}
            </VStack>
            <VStack gap={0} className="items-end">
              <Heading level={1} className="text-5xl tabular-nums">{item.days_until}</Heading>
              <Text className="text-xs uppercase tracking-wider opacity-70">{t.daysLeft}</Text>
            </VStack>
          </HStack>
        </Card>
      </Item>
    </DataList>

    {/* ALL —— 右键卡片:编辑 / 删除 */}
    <DataList collection="events" query={{ orderBy: [{ field: "days_until", direction: "asc" }] }}>
      <Item>
        <Menu id="rowmenu" on="context" trigger={
          <Card className="rounded-2xl">
            <HStack justify="between" className="items-center">
              <VStack gap={1}>
                <HStack gap={2} className="items-center">
                  <Heading level={3}>{item.title}</Heading>
                  {item.cal_badge && <Badge content={item.cal_badge} color="secondary"/>}
                </HStack>
                <HStack gap={5} className="items-center">
                  <Text muted className="text-xs">{item.next_at}</Text>
                  {item.milestone && <Badge content={item.milestone} color="secondary"/>}
                  {item.age_label && <Badge content={item.age_label} color="success"/>}
                </HStack>
                {item.note && <Text muted className="text-xs">{item.note}</Text>}
                {item.secondary && <Text muted className="text-xs opacity-70">{item.secondary}</Text>}
              </VStack>
              <VStack gap={0} className="items-end">
                <Heading level={2} className="tabular-nums">{item.days_until}</Heading>
                <Text muted className="text-xs">{t.daysLeft}</Text>
              </VStack>
            </HStack>
          </Card>
        }>
          <MenuItem value="edit" label={t.btnEdit} icon="pencil"
            onClick={() => scripts.openEdit({ id: item.id, title: item.title, date: item.date, kind: item.kind, calendar: item.calendar, note: item.note, recurring: item.recurring })}/>
          <MenuItem value="delete" label={t.btnDelete} icon="trash" danger
            onClick={() => app.confirm({
              title: t.confirmDelTitle,
              description: item.title,
              confirmLabel: t.btnDelete,
              cancelLabel: t.btnCancel,
              color: "danger",
              onConfirm: () => scripts.removeEvent({ id: item.id })
            })}/>
        </Menu>
      </Item>
    </DataList>
  </VStack>

  {/* FAB —— 独立浮动按钮,点击开新增 sheet(openAdd 清 draft) */}
  <Button icon="plus" color="#ff5e8a" size="lg" className="absolute bottom-5 right-5"
    onClick={() => scripts.openAdd()}/>

  {/* 底部 sheet —— 状态驱动(无 trigger);表单绑 /state/draft/*,add/edit 复用 */}
  <Drawer id="add" side="bottom" title={t.sheetTitle} className="absolute">
    <Input bind="/state/draft/title" placeholder={t.placeholderTitle}/>
    <Input bind="/state/draft/note" placeholder={t.placeholderNote}/>
    <DatePicker bind="/state/draft/date" label={t.labelDate}/>
    <SegmentedControl bind="/state/draft/kind" label={t.labelKind} defaultValue="birthday" options={[
      { value: "birthday", label: t.optBirthday, icon: "cake" },
      { value: "anniversary", label: t.optAnniversary, icon: "heart" },
      { value: "custom", label: t.optCustom, icon: "star" }
    ]}/>
    <SegmentedControl bind="/state/draft/calendar" label={t.labelCalendar} defaultValue="solar" options={[
      { value: "solar", label: t.calSolar },
      { value: "lunar", label: t.calLunar },
      { value: "both", label: t.calBoth }
    ]}/>
    <HStack justify="between" className="items-center mt-1">
      <Switch bind="/state/draft/recurring" checked={true} label={t.switchRecurring}/>
      <Button label={t.btnSave} color="#ff5e8a" icon="check" onClick={() => scripts.saveEvent()}/>
    </HStack>
  </Drawer>

  {/* 删除确认走框架级声明式 app.confirm(内核注入 __ag_confirm Drawer + OK 跑 onConfirm),
      不再自建状态驱动 sheet。见 MenuItem 的 app.confirm({onConfirm: removeEvent})。 */}
</Page>
