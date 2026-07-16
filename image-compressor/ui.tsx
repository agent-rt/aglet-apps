<Page onEnter={() => scripts.init()}>
  <VStack className="p-4 gap-3">

    {/* 主区：drop zone Card，撑满宽；内容居中。auto-height 窗口不用 grow（会破坏 content-size）。
        onDrop：拖入图片文件 → 渲染器注入 path → setSource 选中（点击选图之外的第二入口）。*/}
    <Card className="min-h-[180px] w-full" onDrop={() => scripts.setSource({})}>
      <VStack className="gap-2 items-center justify-center w-full">
        <Show when={{ op: "state", path: "/state/working" }}>
          <Progress indeterminate label={t.statusCompressing}/>
        </Show>
        {state.hasFile
          ? <VStack className="gap-1 items-center w-full">
              <Image src={{ op: "state", path: "/state/srcUrl" }} width={112} height={112} fit="contain"/>
              <Text className="font-bold">{{ op: "state", path: "/state/srcName" }}</Text>
              <Show when={{ op: "state", path: "/state/hasResult" }}>
                {/* Show 子节点不继承外层 items-center，包一层显式居中容器 */}
                <VStack className="items-center gap-2 w-full">
                  {/* 节省徽章（主角）：色随结果——变小绿 / 变大黄 / 持平灰 */}
                  <Badge color={{ op: "state", path: "/state/savedColor" }} content={{ op: "state", path: "/state/savedText" }}/>
                  {/* 前后大小：before 弱化 → after 加粗 */}
                  <HStack className="items-center gap-2 justify-center">
                    <Text className="text-xs" color="secondary">{{ op: "state", path: "/state/sizeBefore" }}</Text>
                    <Text className="text-xs" color="secondary" content="→"/>
                    <Text className="text-xs font-bold">{{ op: "state", path: "/state/sizeAfter" }}</Text>
                  </HStack>
                  {/* 输出文件名，弱化 */}
                  <Text className="text-xs" color="secondary">{{ op: "state", path: "/state/outName" }}</Text>
                </VStack>
              </Show>
              <Button label={t.changeBtn} variant="bordered" size="sm" onClick={() => scripts.pick({})}/>
            </VStack>
          : <VStack className="gap-1 items-center w-full">
              <Text className="font-bold" content={t.dropHint}/>
              <Text className="text-xs" color="secondary" content={t.orBrowse}/>
              <Button label={t.pickBtn} color="primary" size="sm" onClick={() => scripts.pick({})}/>
              <Text className="text-xs" color="secondary" content={t.supported}/>
            </VStack>}
      </VStack>
    </Card>

    {/* 错误 */}
    <Show when={{ op: "state", path: "/state/hasError" }}>
      <Text color="danger">{{ op: "state", path: "/state/errorText" }}</Text>
    </Show>

    {/* 质量预设：原生分段控件（apple=Picker.segmented / windows=ToggleButton 单选组）。
        bind /state/quality → 切换写质量；scripts 订阅它持久化到 settings。 */}
    <SegmentedControl name="quality_preset" bind="/state/quality" options={[
      { value: "90", label: t.presetLight },
      { value: "80", label: t.presetMedium },
      { value: "50", label: t.presetHeavy },
    ]}/>

    {/* 底部状态 pill（填充 Card）*/}
    <Card>
      <HStack className="items-center justify-between w-full">
        <Text className="text-xs" color="secondary">{{ op: "state", path: "/state/status" }}</Text>
        <Text className="text-xs font-bold">{{ op: "state", path: "/state/quality" }}%</Text>
      </HStack>
    </Card>

    {/* 压缩：最下方居中。默认隐藏，选到新图 → canCompress=true 才显示；点击压缩即隐藏
        （scripts 里 run 起手置 false）。canCompress 是正向布尔守卫（native Show 只可靠支持正向）。*/}
    <Show when={{ op: "state", path: "/state/canCompress" }}>
      <HStack className="justify-center w-full">
        <Button label={t.compress} icon="play" color="primary" onClick={() => scripts.compress({})}/>
      </HStack>
    </Show>

  </VStack>
</Page>
