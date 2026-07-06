<Page>
  {state.sync_error && (
    <Alert title={t.syncError} description={{ op: "state", path: "/state/sync_error" }} color="warning" icon="warning"/>
  )}

  <Tabs id="main" defaultValue="latest" position="bottom">
    <Tab value="latest" label={t.tabLatest} icon="clock-counter-clockwise">
      <DataList
        collection="latest_topics"
        query={{ orderBy: [{ field: "published_ts", direction: "desc" }], limit: 100 }}
        paginate={{ pageSize: 12, infinite: true }}
      >
        <Empty>
          <EmptyState title={t.emptyLatestTitle} description={t.emptyDesc} icon="chats-circle"/>
        </Empty>
        <Item>
          <Card>
            <VStack gap={5}>
              <HStack justify="between" gap={6} className="items-start">
                <Heading level={3}>{item.title}</Heading>
                {item.node && <Badge content={item.node} color="secondary"/>}
              </HStack>
              <HStack gap={1} className="items-center">
                <Text muted className="text-xs">{item.author}</Text>
                <Text muted className="text-xs">·</Text>
                <Text muted className="text-xs">{item.published_at | relative}</Text>
              </HStack>
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

    <Tab value="hot" label={t.tabHot} icon="fire">
      <DataList
        collection="hot_topics"
        query={{ orderBy: [{ field: "published_ts", direction: "desc" }], limit: 100 }}
        paginate={{ pageSize: 12, infinite: true }}
      >
        <Empty>
          <EmptyState title={t.emptyHotTitle} description={t.emptyDesc} icon="fire"/>
        </Empty>
        <Item>
          <Card>
            <VStack gap={5}>
              <HStack justify="between" gap={6} className="items-start">
                <Heading level={3}>{item.title}</Heading>
                {item.node && <Badge content={item.node} color="warning" icon="fire"/>}
              </HStack>
              <HStack gap={1} className="items-center">
                <Text muted className="text-xs">{item.author}</Text>
                <Text muted className="text-xs">·</Text>
                <Text muted className="text-xs">{item.published_at | relative}</Text>
              </HStack>
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
