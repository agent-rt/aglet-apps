<Page onEnter={() => scripts.refresh()}>
  <VStack className="p-5 gap-4 select-none">
    <Heading level={1}>{t.heading}</Heading>

    <DataList collection="events" query={{ orderBy: [{ field: "days_until", direction: "asc" }], limit: 1 }}>
      <Empty><EmptyState title={t.empty} icon="calendar"/></Empty>
      <Item>
        <Card className="bg-indigo-500 text-white">
          <Text className="text-xs uppercase tracking-widest opacity-80">{t.next}</Text>
          <HStack justify="between" className="items-end mt-1">
            <VStack gap={2}>
              <Heading level={2}>{item.title}</Heading>
              <Text className="opacity-90">{item.next_at} · {item.milestone}</Text>
            </VStack>
            <VStack gap={0} className="items-end">
              <Heading level={1} className="text-5xl tabular-nums">{item.days_until}</Heading>
              <Text className="opacity-90 text-sm">{t.daysLeft}</Text>
            </VStack>
          </HStack>
        </Card>
      </Item>
    </DataList>

    <Card>
      <DataForm collection="events">
        <Input name="title" placeholder={t.placeholderTitle}/>
        <HStack gap={3}>
          <DatePicker name="date" label={t.labelDate}/>
          <Select name="kind" label={t.labelKind} placeholder={t.labelKind}>
            <Option value="birthday" label={t.optBirthday}/>
            <Option value="anniversary" label={t.optAnniversary}/>
            <Option value="custom" label={t.optCustom}/>
          </Select>
        </HStack>
        <HStack justify="between" className="items-center">
          <Switch name="recurring" label={t.switchRecurring}/>
          <Button label={t.btnAdd} color="primary" icon="plus" disabled={!form.title} onClick={() => scripts.addEvent()}/>
        </HStack>
      </DataForm>
    </Card>

    <DataList collection="events" query={{ orderBy: [{ field: "days_until", direction: "asc" }] }}>
      <Empty><EmptyState title={t.empty} icon="calendar"/></Empty>
      <Item>
        <Card>
          <HStack justify="between" className="items-center">
            <VStack gap={2}>
              <Heading level={3}>{item.title}</Heading>
              <HStack gap={6} className="items-center">
                <Text muted className="text-xs">{item.next_at}</Text>
                {item.milestone && <Badge content={item.milestone} color="secondary"/>}
                {item.age_label && <Badge content={item.age_label} color="success"/>}
              </HStack>
            </VStack>
            <HStack gap={4} className="items-center">
              <VStack gap={0} className="items-end">
                <Heading level={3} className="tabular-nums">{item.days_until}</Heading>
                <Text muted className="text-xs">{t.daysLeft}</Text>
              </VStack>
              <Button label={t.btnDelete} color="danger" size="sm" onClick={() => data.delete({ collection: "events", id: item.id })}/>
            </HStack>
          </HStack>
        </Card>
      </Item>
    </DataList>
  </VStack>
</Page>
