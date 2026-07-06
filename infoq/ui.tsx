<Page>
  {state.sync_error && (
    <Alert title={t.syncError} description={{ op: "state", path: "/state/sync_error" }} color="warning" icon="warning"/>
  )}

  <VStack gap={0} className="px-3 py-2">
    <DataList
      collection="recommended_articles"
      query={{ orderBy: [{ field: "published_ts", direction: "desc" }], limit: 100 }}
      paginate={{ pageSize: 12, infinite: true }}
    >
      <Empty>
        <EmptyState title={t.emptyRecommendTitle} description={t.emptyDesc} icon="newspaper-clipping"/>
      </Empty>
      <Item>
        <Card>
          <VStack gap={5}>
            <HStack justify="between" gap={6} className="items-start">
              <Heading level={3}>{item.title}</Heading>
              {item.category && <Badge content={item.category} color="success"/>}
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
  </VStack>
</Page>
