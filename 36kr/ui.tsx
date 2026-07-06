<Page>
  {state.sync_error && (
    <Alert title={t.syncError} description={{ op: "state", path: "/state/sync_error" }} color="warning" icon="warning"/>
  )}

  <Tabs id="main" defaultValue="hot" position="bottom">
    <Tab value="hot" label={t.tabHot} icon="fire">
      <DataList
        collection="hot_items"
        query={{ orderBy: [{ field: "published_ts", direction: "desc" }], limit: 100 }}
        paginate={{ pageSize: 10, infinite: true }}
      >
        <Empty>
          <EmptyState title={t.emptyHotTitle} description={t.emptyDesc} icon="newspaper"/>
        </Empty>
        <Item>
          <Card>
            <VStack gap={5}>
              <HStack justify="between" gap={6} className="items-start">
                <Heading level={3}>{item.title}</Heading>
                <Badge content={t.badgeHot} color="warning" icon="fire"/>
              </HStack>
              <Text muted className="text-xs">{item.published_at | relative}</Text>
              <Text>{item.summary}</Text>
              <HStack justify="end">
                <Tooltip content={item.url}>
                  <Link label={t.btnOpen} icon="arrow-square-out" href={item.url}/>
                </Tooltip>
              </HStack>
            </VStack>
          </Card>
        </Item>
      </DataList>
    </Tab>

    <Tab value="flash" label={t.tabFlash} icon="lightning">
      <DataList
        collection="newsflashes"
        query={{ orderBy: [{ field: "published_ts", direction: "desc" }], limit: 120 }}
        paginate={{ pageSize: 14, infinite: true }}
      >
        <Empty>
          <EmptyState title={t.emptyFlashTitle} description={t.emptyDesc} icon="lightning"/>
        </Empty>
        <Item>
          <Card>
            <VStack gap={5}>
              <HStack justify="between" gap={6} className="items-start">
                <Heading level={3}>{item.title}</Heading>
                <Badge content={t.badgeFlash} color="primary" icon="lightning"/>
              </HStack>
              <Text muted className="text-xs">{item.published_at | relative}</Text>
              <Text>{item.summary}</Text>
              <HStack justify="end">
                <Tooltip content={item.url}>
                  <Link label={t.btnOpen} icon="arrow-square-out" href={item.url}/>
                </Tooltip>
              </HStack>
            </VStack>
          </Card>
        </Item>
      </DataList>
    </Tab>
  </Tabs>
</Page>
