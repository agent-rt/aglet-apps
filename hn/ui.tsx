<Page onEnter={() => scripts.refreshNow()}>
  {/* onEnter：开窗即刷一轮榜。feed 只显示 `on_front:true`，而 0.1.4 之前入库的老记录没有
      这个字段 —— 没有它的话升级后界面会空着等到下一个 15 分钟 job 周期（实测踩过）。 */}
  <Tabs id="main" defaultValue="feed" position="bottom">
    <Tab value="feed" label={t.tabFeed} icon="fire">
      <DataList
        collection="stories"
        query={{
          // 排序 = 官方 rank 升序:rank 是 topstories.json 的数组下标,即 HN 的热度排名
          // (此前按 hn_id desc / 提交时间排,与首页前 10 只有 1 条重合)。
          // **不按 on_front 过滤 —— 历史全展示**:榜内 30 条(rank 0..29)在最前、与首页一致,
          // 离榜的 rank=OFF_RANK 自然接在后面,往下滚就是历史。
          // 次级键 hn_id desc 是必须的:离榜记录 rank 全等于 OFF_RANK,只按 rank 排它们之间
          // 顺序不定(实测多字段 orderBy 生效:desc→[903,902]、asc→[902,903])。
          where: { disliked: false },
          orderBy: [
            { field: "rank", direction: "asc" },
            { field: "hn_id", direction: "desc" },
          ],
        }}
        paginate={{ pageSize: 10, infinite: true }}
      >
        <Empty>
          <EmptyState
            title={t.emptyFeedTitle}
            description={t.emptyFeedDesc}
            icon="newspaper"
          />
        </Empty>
        <Item>
          <Card>
            <VStack gap={4}>
              <HStack justify="between" gap={6}>
                <Heading level={3}>{item.title || item.title_en}</Heading>
                <Badge content={item.points} color="warning" icon="fire"/>
              </HStack>
              <HStack gap={5} align="center">
                <Text muted>{item.domain} · {item.author}</Text>
                <HStack gap={1} align="center">
                  <Icon symbol="chat-circle" size="sm" color="secondary"/>
                  <Text muted>{item.comments}</Text>
                </HStack>
                <HStack gap={1} align="center">
                  <Icon symbol="clock" size="sm" color="secondary"/>
                  <Text muted>{item.time | relative}</Text>
                </HStack>
              </HStack>
              <Text>{item.summary}</Text>
              <HStack justify="end" gap={6} align="center">
                <Tooltip content={item.url}>
                  <Link label={t.btnSource} icon="link" href={item.url}/>
                </Tooltip>
                <Tooltip content={t.tipLike}>
                  <Button
                    label={t.btnLike}
                    icon="heart"
                    variant="flat"
                    pressed={item.liked}
                    onClick={() => data.update({
                      collection: "stories",
                      id: item.id,
                      patch: { liked: !item.liked, disliked: false },
                    })}
                  />
                </Tooltip>
                <Tooltip content={t.tipBlock}>
                  <Button
                    label={t.btnBlock}
                    icon="prohibit"
                    color="danger"
                    variant="flat"
                    onClick={() => data.update({
                      collection: "stories",
                      id: item.id,
                      patch: { liked: false, disliked: true },
                    })}
                  />
                </Tooltip>
              </HStack>
            </VStack>
          </Card>
        </Item>
      </DataList>
    </Tab>

    <Tab value="liked" label={t.tabLiked} icon="heart">
      <DataList
        collection="stories"
        query={{ where: { liked: true }, orderBy: [{ field: "points", direction: "desc" }] }}
      >
        <Empty><EmptyState title={t.emptyLikedTitle} icon="heart-break"/></Empty>
        <Item>
          <Card>
            <VStack gap={4}>
              <HStack justify="between" gap={6}>
                <Heading level={3}>{item.title || item.title_en}</Heading>
                <Badge content={item.points} color="warning" icon="fire"/>
              </HStack>
              <Text muted>{item.domain}</Text>
              <Text>{item.summary}</Text>
              <HStack justify="end" gap={6} align="center">
                <Link label={t.btnSource} icon="link" href={item.url}/>
                <Button
                  label={t.btnUnlike}
                  icon="heart"
                  variant="flat"
                  onClick={() => data.update({
                    collection: "stories", id: item.id, patch: { liked: false },
                  })}
                />
              </HStack>
            </VStack>
          </Card>
        </Item>
      </DataList>
    </Tab>

    <Tab value="blocked" label={t.tabBlocked} icon="prohibit">
      <DataList collection="stories" query={{ where: { disliked: true } }}>
        <Empty><EmptyState title={t.emptyBlockedTitle}/></Empty>
        <Item>
          <Card>
            <HStack justify="between" gap={8} align="center">
              <VStack gap={1}>
                <Text>{item.title || item.title_en}</Text>
                <Text muted>{item.domain}</Text>
              </VStack>
              <Button
                label={t.btnRestore}
                icon="arrow-counter-clockwise"
                variant="flat"
                onClick={() => data.update({
                  collection: "stories", id: item.id, patch: { disliked: false },
                })}
              />
            </HStack>
          </Card>
        </Item>
      </DataList>
    </Tab>
  </Tabs>
</Page>
