<Page>
  {state.sync_error && (
    <Alert title={t.syncError} description={{ op: "state", path: "/state/sync_error" }} color="warning" icon="warning"/>
  )}

  <Tabs id="main" defaultValue="index" position="bottom">
    <Tab value="index" label={t.tabIndex} icon="article-medium">
      <DataList
        collection="index_articles"
        query={{ orderBy: [{ field: "published_ts", direction: "desc" }], limit: 100 }}
        paginate={{ pageSize: 12, infinite: true }}
      >
        <Empty>
          <EmptyState title={t.emptyIndexTitle} description={t.emptyDesc} icon="article-medium"/>
        </Empty>
        <Item>
          <Card>
            <VStack gap={5}>
              <Heading level={3}>{item.title}</Heading>
              <HStack gap={1} className="items-center">
                {item.author && <Text muted className="text-xs">{item.author}</Text>}
                {item.author && <Text muted className="text-xs">·</Text>}
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

    <Tab value="matrix" label={t.tabMatrix} icon="squares-four">
      <DataList
        collection="matrix_articles"
        query={{ orderBy: [{ field: "published_ts", direction: "desc" }], limit: 100 }}
        paginate={{ pageSize: 12, infinite: true }}
      >
        <Empty>
          <EmptyState title={t.emptyMatrixTitle} description={t.emptyDesc} icon="squares-four"/>
        </Empty>
        <Item>
          <Card>
            <VStack gap={5}>
              <HStack justify="between" gap={6} className="items-start">
                <Heading level={3}>{item.title}</Heading>
                <Badge content="Matrix" color="danger"/>
              </HStack>
              <HStack gap={1} className="items-center">
                {item.author && <Text muted className="text-xs">{item.author}</Text>}
                {item.author && <Text muted className="text-xs">·</Text>}
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
