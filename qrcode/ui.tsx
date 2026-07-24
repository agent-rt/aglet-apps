<Page onEnter={() => scripts.init()}>
  <VStack className="p-4 gap-3">

    {/* 模式切换：生成 / 识别。size=sm 更紧凑;bind 写 /state/mode；init 订阅它派生正向布尔
        genMode/scanMode（native 条件守卫只可靠支持正向 {state.x && ...}）。 */}
    <SegmentedControl name="mode" bind="/state/mode" size="sm" options={[
      { value: "gen", label: t.tabGen, icon: "qr-code" },
      { value: "scan", label: t.tabScan, icon: "scan" },
    ]}/>

    {/* ============ 生成 ============ */}
    {state.genMode &&
      <VStack className="gap-3">
        {/* 字段=小号灰标签 + 紧凑控件(自绘标签比组件 label 更贴 mock 的 small-gray 观感)。 */}
        <VStack className="gap-1">
          <Text className="text-xs" color="secondary" content={t.textLabel}/>
          <Input name="text" bind="/state/text" placeholder={t.textPlaceholder} size="sm"/>
        </VStack>

        {/* 二维码卡：居中 + 内容宽(不铺满),白底浮在深色背景上 —— 对齐 mock。
            恒白底(真码须暗-on-亮才可扫,不随暗色主题反相)。 */}
        <HStack justify="center">
          <VStack className="items-center justify-center bg-[#ffffff] rounded-2xl w-[236px] h-[236px]">
            {state.hasQr
              ? <Image src={state.qrUrl} width={204} height={204} fit="contain"/>
              : <VStack className="items-center justify-center gap-2">
                  <Icon symbol="qr-code" size="lg" color="secondary"/>
                  <Text className="text-xs" color="secondary" content={t.emptyHint}/>
                </VStack>}
          </VStack>
        </HStack>

        {state.genError &&
          <Alert color="danger" title={t.genErrTitle} description={state.genError}/>}

        <HStack className="gap-3">
          <VStack className="gap-1 flex-1 w-full items-center">
            <Text className="text-xs" color="secondary" content={t.fmtLabel}/>
            <Select name="format" bind="/state/format" size="sm">
              <Option value="QRCode" label="QR"/>
              <Option value="Code128" label="Code 128"/>
              <Option value="EAN13" label="EAN-13"/>
              <Option value="DataMatrix" label="Data Matrix"/>
            </Select>
          </VStack>
          <VStack className="gap-1 flex-1 w-full items-center">
            <Text className="text-xs" color="secondary" content={t.eccLabel}/>
            <Select name="ecc" bind="/state/ecc" size="sm">
              <Option value="L" label="L · 7%"/>
              <Option value="M" label="M · 15%"/>
              <Option value="Q" label="Q · 25%"/>
              <Option value="H" label="H · 30%"/>
            </Select>
          </VStack>
        </HStack>

        <VStack className="gap-1">
          <Text className="text-xs" color="secondary" content={t.sizeLabel}/>
          <Slider name="size" bind="/state/size" min={128} max={512} step={32} showValue/>
        </VStack>

        <HStack className="gap-3">
          <Button label={t.copyBtn} color="#6366f1" leftIcon="copy" size="sm"
            className="flex-1 w-full" onClick={() => scripts.copyImage()}/>
          <Button label={t.saveBtn} variant="bordered" leftIcon="download-simple" size="sm"
            className="flex-1 w-full" onClick={() => scripts.savePng()}/>
        </HStack>
      </VStack>}

    {/* ============ 识别 ============ */}
    {state.scanMode &&
      <VStack className="gap-3">
        {/* Card 只作 drop 区(onDrop);内容居中靠内层 VStack items-center(Card 自身不居中子节点)。 */}
        <Card className="p-6" onDrop={() => scripts.scanDropped({})}>
          <VStack className="items-center gap-2 w-full">
            <Icon symbol="scan" size="lg" color="secondary"/>
            <Text className="font-bold" content={t.scanHint}/>
            <Text className="text-xs" color="secondary" content={t.scanSub}/>
            <HStack className="gap-2">
              <Button label={t.pickBtn} variant="bordered" size="sm"
                onClick={() => scripts.scanPick()}/>
              <Button label={t.pasteBtn} variant="bordered" size="sm"
                onClick={() => scripts.pasteScan()}/>
            </HStack>
          </VStack>
        </Card>

        {state.hasScan &&
          <Card className="gap-2">
            <HStack justify="between" align="center">
              <Text className="text-xs" color="secondary" content={t.scanResult}/>
              <Badge content={state.scanFormat} color="success"/>
            </HStack>
            <CodeBlock code={state.scanText}/>
            <Button label={t.copyText} variant="light" size="sm" leftIcon="copy"
              color="#6366f1" onClick={() => scripts.copyScanText()}/>
          </Card>}

        {state.scanError &&
          <Alert color="danger" title={t.scanErrTitle} description={state.scanError}/>}
      </VStack>}

  </VStack>
</Page>
