<Page className="p-3">
  <VStack className="gap-2">

    <HStack justify="between" align="center">
      <Heading level={3} content={t.title}/>
      <Button label={t.clear} variant="ghost" size="sm" color="danger" leftIcon="trash"
        onClick={() => scripts.clearAll()}/>
    </HStack>

    <DataList collection="clips"
      query={{ orderBy: [{ field: "ts", direction: "desc" }], limit: 100 }}>
      <Empty>
        <EmptyState icon="clipboard" title={t.emptyTitle} description={t.emptyDesc}/>
      </Empty>
      <Item>
        <Card className="gap-1">
          <Text className="text-sm" content={item.preview}/>
          <HStack justify="between" align="center">
            <Text className="text-xs" color="secondary" content={item.ts | relative}/>
            <HStack className="gap-1">
              <Button label={t.copy} variant="ghost" size="sm" leftIcon="copy"
                color="#0ea5e9" onClick={() => scripts.recopy({ text: item.text })}/>
              <Button variant="ghost" size="sm" leftIcon="trash"
                onClick={() => scripts.remove({ id: item.id })}/>
            </HStack>
          </HStack>
        </Card>
      </Item>
    </DataList>

  </VStack>
</Page>
