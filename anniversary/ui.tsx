<Page onEnter={() => scripts.refresh()}>
  <VStack className="p-5 gap-4">
    {/* HERO —— 最近一个纪念日:大字倒数 = thesis */}
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
            </VStack>
            <VStack gap={0} className="items-end">
              <Heading level={1} className="text-5xl tabular-nums">{item.days_until}</Heading>
              <Text className="text-xs uppercase tracking-wider opacity-70">{t.daysLeft}</Text>
            </VStack>
          </HStack>
        </Card>
      </Item>
    </DataList>

    {/* ALL —— 全部纪念日,按天数升序 */}
    <DataList collection="events" query={{ orderBy: [{ field: "days_until", direction: "asc" }] }}>
      <Item>
        <Card className="rounded-2xl">
          <HStack justify="between" className="items-center">
            <VStack gap={1}>
              <Heading level={3}>{item.title}</Heading>
              <HStack gap={5} className="items-center">
                <Text muted className="text-xs">{item.next_at}</Text>
                {item.milestone && <Badge content={item.milestone} color="secondary"/>}
                {item.age_label && <Badge content={item.age_label} color="success"/>}
              </HStack>
            </VStack>
            <HStack gap={3} className="items-center">
              <VStack gap={0} className="items-end">
                <Heading level={3} className="tabular-nums">{item.days_until}</Heading>
                <Text muted className="text-xs">{t.daysLeft}</Text>
              </VStack>
              <Menu id="rowmenu" trigger={<Button icon="dots-three" variant="flat" size="sm"/>}>
                <MenuItem value="delete" label={t.btnDelete} icon="trash" danger
                  onClick={() => data.delete({ collection: "events", id: item.id })}/>
              </Menu>
            </HStack>
          </HStack>
        </Card>
      </Item>
    </DataList>
  </VStack>

  {/* FAB —— 浮动 + 按钮,点击从底部弹出添加 sheet */}
  <Drawer id="add" side="bottom" title={t.sheetTitle} className="absolute bottom-5 right-5"
    trigger={<Button icon="plus" color="#ff5e8a" size="lg"/>}>
    <DataForm collection="events">
      <Input name="title" placeholder={t.placeholderTitle}/>
      <DatePicker name="date" label={t.labelDate}/>
      <SegmentedControl name="kind" label={t.labelKind} defaultValue="birthday" options={[
        { value: "birthday", label: t.optBirthday, icon: "cake" },
        { value: "anniversary", label: t.optAnniversary, icon: "heart" },
        { value: "custom", label: t.optCustom, icon: "star" }
      ]}/>
      <HStack justify="between" className="items-center mt-1">
        <Switch name="recurring" label={t.switchRecurring} checked={true}/>
        <Button label={t.btnAdd} color="#ff5e8a" icon="plus" disabled={!form.title}
          onClick={() => scripts.addEvent()}/>
      </HStack>
    </DataForm>
  </Drawer>
</Page>
