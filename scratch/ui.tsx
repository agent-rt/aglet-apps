<Page onDrop={() => scripts.attach({})}>
  {/* 形态 = 给自己发消息:列表在上滚,输入条固定在底部,待发附件以小卡片排在输入框上方(带 × 可删)。
      · onDrop 挂 Page = **整窗可拖放**(渲染器侧 onDrop 本就通用),首页不为拖放留位置
      · 底部固定靠 `position:absolute` —— 内核把带 absolute/fixed 的子节点提到浮动层
        (apple floatingLayer),对齐由 inset_* 推:只给 bottom/left/right → 贴底满宽
      ⚠️ TSX 文件必须以 `<` 开头,注释不能放在根元素之前 */}

  <VStack gap={3}>
    {/* 搜索框单独一行 —— 放进 header 的 HStack 会贪婪占满、把标题挤成零宽(踩过) */}
    <Heading level={3}>{t.title}</Heading>
    <Input name="q" bind="/state/q" placeholder={t.search} size="sm"/>

    <DataList
      collection="notes"
      query={{
        where: { body: { $contains: state.q } },
        orderBy: [{ field: "pinned", direction: "desc" }, { field: "created_at", direction: "desc" }]
      }}
      paginate={{ pageSize: 20, infinite: true, maxRows: 500 }}
    >
      <Empty>
        <EmptyState title={t.emptyTitle} description={t.emptyDesc} icon="note-pencil"/>
      </Empty>
      <Item>
        <Card>
          <VStack gap={2}>
            {item.pinned && <Badge content="📌" color="warning"/>}
            {/* 缩略图是 data: URI(native <Image> 只解这个);见 scripts.js thumbOf */}
            {item.att_thumb && <Image src={item.att_thumb} alt={item.att_name} className="rounded-md"/>}
            {item.att_name && (
              <HStack gap={2} align="center">
                <Icon symbol="paperclip" size="sm" color="secondary"/>
                <Text className="truncate">{item.att_name}</Text>
                <Spacer/>
                {item.att_missing && <Tag label={t.gone} color="danger" size="sm"/>}
                <Text muted size="sm">{item.att_size | bytes}</Text>
              </HStack>
            )}
            {item.has_note && <Markdown source={item.body}/>}
            <HStack justify="between" align="center">
              <Text muted size="sm">{item.created_at | relative}</Text>
              <HStack gap={4}>
                <Button icon="push-pin" variant="flat" size="sm" pressed={item.pinned}
                        onClick={() => scripts.togglePin({ id: item.id })}/>
                <Button icon="share-network" variant="flat" size="sm"
                        onClick={() => scripts.share({ id: item.id })}/>
                <Button icon="trash" variant="flat" size="sm" color="danger"
                        onClick={() => scripts.remove({ id: item.id })}/>
              </HStack>
            </HStack>
          </VStack>
        </Card>
      </Item>
    </DataList>

    {/* 给底部输入条让位,免得最后一条被压住 */}
    <Spacer className="h-28"/>
  </VStack>

  {/* ── 底部固定输入条 ─────────────────────────────────────────────────── */}
  <VStack gap={2} className="absolute bottom-0 left-0 right-0 p-3 bg-[var(--ag-surface)]">
    {/* 待发附件:拖进来/选进来先排在这里,× 可删,点发送才入库 */}
    <For each={state.pending}>
      <HStack gap={2} align="center" className="rounded-md bg-[var(--ag-surface-2)] p-2">
        {item.thumb && <Image src={item.thumb} alt={item.name} width={44} height={44} className="rounded"/>}
        {item.noThumb && <Icon symbol="paperclip" size="sm" color="secondary"/>}
        <Text className="truncate" size="sm">{item.name}</Text>
        <Spacer/>
        <Text muted size="sm">{item.size | bytes}</Text>
        <Button icon="x" variant="flat" size="sm" onClick={() => scripts.unpend({ i: item.i })}/>
      </HStack>
    </For>

    <HStack gap={2} align="center">
      <Button icon="paperclip" variant="flat" size="sm" onClick={() => scripts.pickFiles({})}/>
      <Textarea name="draft" bind="/state/draft" placeholder={t.ph} rows={2} className="flex-1"/>
      <Button icon="paper-plane-right" color="primary" onClick={() => scripts.send({})}/>
    </HStack>
  </VStack>
</Page>
