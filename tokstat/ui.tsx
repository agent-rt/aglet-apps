<Tray id="main" onClick="popover">
  <TrayLabel>
    {/* 方向由设置 menubar_layout 决定:水平=两组并排一行、竖直=上下两行。walker 只 emit
        命中分支;menubar 空时 <Icon> 兜底。品牌 logo 用 data URI(单色 → 按栏明暗 tint)。 */}
    {settings.menubar_layout !== "vertical" && (
      <HStack gap={8}>
        {settings.enable_claude !== "false" && settings.tray_claude !== "false" && (
<HStack gap={3}>
      <Image height={16} src="data:image/png;base64,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"/>
      {settings.menubar_style !== "text" && settings.menubar_style !== "gauge" && (
      <Progress width={24} height={8} value={{op:"data", collection:"current", where:{source:"claude"}, latest:true, field:"session_pct"}} max={100} color={{op:"data", collection:"current", where:{source:"claude"}, latest:true, field:"session_color"}}/>
      )}
      {settings.menubar_style === "text" && (
      <Text content={{op:"data", collection:"current", where:{source:"claude"}, latest:true, field:"session_pct_text"}} className="text-[12px] font-semibold"/>
      )}
      {settings.menubar_style === "gauge" && (
      <Meter width={16} height={16} value={{op:"data", collection:"current", where:{source:"claude"}, latest:true, field:"session_pct"}} max={100} color={{op:"data", collection:"current", where:{source:"claude"}, latest:true, field:"session_color"}}/>
      )}
    </HStack>
)}
        {settings.enable_codex !== "false" && settings.tray_codex !== "false" && (
<HStack gap={3}>
      <Image height={16} src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAAAXNSR0IArs4c6QAAAHhlWElmTU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAIdpAAQAAAABAAAATgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAACygAwAEAAAAAQAAACwAAAAAz+HTlAAAAAlwSFlzAAALEwAACxMBAJqcGAAAB45JREFUWAnFmAuIVUUYx3d9re+3VmY+S/AdWelqPkIjScMg0SItJaJSSSwR1GQ1SM3UCA0LQtHKHmaWoWUim2ZWlhqapqKpidX6fud7+/2v892dO3vu9ayG/uG3M/N938yZe86cb+ZsdtY1qLCw8Ga6t4P2MAw2wjz4FTZlZ2efp7zxYqJtYQ7shyhdwLgOhkDFGzZjLl4axsJJ8HWWxhE44Rtd/UdKPYWEqFeFulADSps9bpkdN5DByxH7DgxyfU5SLoIvYAscg7LQEB6EJ1ydIusALIQ20AAqwDkogF/gc1jOEpLt/xETng6mFVTaZhoZf03Ih7jSk9APvXYxUC+45K68kDLjusR/B8yG42DSktEPnQXTQP41cApMWvt5EPvJF/t1dC4HP4O0BaoXC3IGfNVgHBwC01EqE6FRVD/szeENOAOmSVGxsWyM0N1Goewf1Ql7NjwGm8GkJ/IRtIzqE9qI03X2gUnvQMlF7xluhN2UlcMRsHWAr12MFT9QKfF6pE8uHHOD7KWsE14vsk1gGegPmshpkD71g2lXh5lwBkx7qDwHOX6s1bG3guehmdnCEt9IMI0M/cXaRLYAvRyhpvvBOP2BlX+ngna+YsJeByaBvYRa41rr1cJgbFVgF0h6d9Lnapxd4G8waSLnXOM1f3BsU5xdb3lX32d17HpSg2EnRElrvp/FW4ntLResDaqR2VWWsgYOvRwLwO7SXOqaiJJ+lC4543HK9WEA43XBthxmQxPn1yYxHn5z7RaUHxP7JSR3Q2xrnb8SZQNXLyoIzoHVYBorL43KYHc8vMOTXfA/lDVtNOqN4V04D6Y/qQyHRP6m1PY8Gg6ASU9K+bk2dDMjZS8bO1li1GMzzTIHBu1WcSZcgbhKMArCA5GWQ3Mb0y+xNwH9OFt2VAt3wFxQWpS6+310F7XObGPQnahlAdTjTFg/aBBsgChdxCjfozZuWOLrDCsg1L8YmqbEY2gD9vhe9Z3Y40xYE/KlH9/bsdZ3UF8M/lpNXg67ToIDYRuY9NLdlwxSBYOCJD2Czr6TdpwJq6+0G4ZABRuDenlQ3t0FJq1VHaTs5bbwRIld13wd7EZoAynK2zSWg6QUpqNhUrTjTFhnYaW4m5Idgwo+nX8Vo1jTHiraZHRsLSbs+vE26fxkHJXjIB2BW/yetP0JTw58fpbIeHpTP8aqCMooob7H0MMf2+rYZ3jBA2VXHn7bBSjnpT2J4ZM/ncqnc3h2P+Y77Pr+kzrCMib2HjROWIr+TKD6l2sOxV9GE17pDPpauNPVrdDmUMY1tNbHQBXXLrSgqyjz6dMJ8uAwaB4D4DPGTz4tvkAOYpsP0l3QXIHapY6AFG6T2sU+THiysrTvK4voEfamVN+rVQ6TOQmvMEAurHED6Q6H54uvnE83tG2izgQ+AEknrw4uIFlg6wPrwddB11AezrSU7Bo63dkmFL4PL7uxdChKyR60G4Eyi7TE7tJURj0DOhbOxJHyK7kT+tBUytNxrwAk22D0y22ZJBxp/ihGsVFKfyLLyjpLB/s47ZKYMBPagFGTlpTY5zPplMMzMadgGr72oK9nG0QT/4b4J8HWO6bLkg30hi8D+5HOG6uoSpTldl33shhU3246Odke/jv1vuYPS3ydwHI41YS+5W9y71cdZAsVLok8FxC1JPp6nVMPQjhuBX00+lpC455wwmpjLwUDwN9Olez1TrwPlvipFv4BthZLMuFP1Blpn6iXMg8M7cAucp66SYcQJfH6KR1cA7teqNGgOxRKL+dY0MuzzzljTZjY9qBrS4lsZS+dzaMuFbO9QP1N0KIvD8PgJzoOh2SuxCadgL1g61q2izAPcln7SodHIdPLhbtIXENnbB11dW2NOx1SRVBPMPWUl0YuaCfytY7Gw5ADPWA1+FpJ435/dNq1wLbmdHdYT6MyNAB/7U/xx0rWCbob7KUbag5s2fA46B8pvjbTuOAZdlJ/GoqlL2xVYD9I6SZ8GN940LnctJiK7nJx4dBdKHCRC8II7Fqr4yBcq/pfwiRISYXWH7sOUVPAflzKHcOeB1FSes2c4wlY5HpqEk3ton6JvRnoM0Y7l1JhK99vdeyl4SnYDqZzVPpYjEraU83pSj2pZyHbj4usE9TbdVJhB490sXoxIkXfrpAPvrQuu4YdsC11Qcr9A6FGGJO2TbB2Jv8lG5M2OMJB39thNvhpcQftwRC1E9bDbktsRMSQVzYxgB65vdFUEzm4dqaexFQD5Vu96SYtq4mQti++CS74NGWzTNfI6KNzNzjgBlOhnSoPlMz1yaP0o5epNYwAPU5fWtstM10Ef0c44TrNyRQby8dA7UBfwb6U9vRD9oBeOr1EvjbSSMnBURcjphPsdR01TsOouBLbGEh38kUIczCmSG3H2g8qRV0Me31QrrU7q6XwUFRslO3KacP1YlBtxzoE3QuNQUc+fZFshU3wEjwCpu1UVsE20FlbOVqfYB3B1vQh6s+wdS+ivL7iB5WFUWAbD9WMWoq39fWdZcTVmMRtoImvAk3+LCjFaQlsBaW8ByK6xjLFXhKxRguCmJiWgb4ylH91oivg8Wt5XLX+AzGCkeGllMgMAAAAAElFTkSuQmCC"/>
      {settings.menubar_style !== "text" && settings.menubar_style !== "gauge" && (
      <Progress width={24} height={8} value={{op:"data", collection:"current", where:{source:"codex"}, latest:true, field:"session_pct"}} max={100} color={{op:"data", collection:"current", where:{source:"codex"}, latest:true, field:"session_color"}}/>
      )}
      {settings.menubar_style === "text" && (
      <Text content={{op:"data", collection:"current", where:{source:"codex"}, latest:true, field:"session_pct_text"}} className="text-[12px] font-semibold"/>
      )}
      {settings.menubar_style === "gauge" && (
      <Meter width={16} height={16} value={{op:"data", collection:"current", where:{source:"codex"}, latest:true, field:"session_pct"}} max={100} color={{op:"data", collection:"current", where:{source:"codex"}, latest:true, field:"session_color"}}/>
      )}
    </HStack>
)}
      </HStack>
    )}
    {settings.menubar_layout === "vertical" && (
      <VStack gap={1}>
        {settings.enable_claude !== "false" && settings.tray_claude !== "false" && (
<HStack gap={3}>
      <Image src="data:image/png;base64,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"/>
      {settings.menubar_style !== "text" && settings.menubar_style !== "gauge" && (
      <Progress value={{op:"data", collection:"current", where:{source:"claude"}, latest:true, field:"session_pct"}} max={100} color={{op:"data", collection:"current", where:{source:"claude"}, latest:true, field:"session_color"}}/>
      )}
      {settings.menubar_style === "text" && (
      <Text content={{op:"data", collection:"current", where:{source:"claude"}, latest:true, field:"session_pct_text"}} className="text-[12px] font-semibold"/>
      )}
      {settings.menubar_style === "gauge" && (
      <Meter width={16} height={16} value={{op:"data", collection:"current", where:{source:"claude"}, latest:true, field:"session_pct"}} max={100} color={{op:"data", collection:"current", where:{source:"claude"}, latest:true, field:"session_color"}}/>
      )}
    </HStack>
)}
        {settings.enable_codex !== "false" && settings.tray_codex !== "false" && (
<HStack gap={3}>
      <Image src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAAAXNSR0IArs4c6QAAAHhlWElmTU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAIdpAAQAAAABAAAATgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAACygAwAEAAAAAQAAACwAAAAAz+HTlAAAAAlwSFlzAAALEwAACxMBAJqcGAAAB45JREFUWAnFmAuIVUUYx3d9re+3VmY+S/AdWelqPkIjScMg0SItJaJSSSwR1GQ1SM3UCA0LQtHKHmaWoWUim2ZWlhqapqKpidX6fud7+/2v892dO3vu9ayG/uG3M/N938yZe86cb+ZsdtY1qLCw8Ga6t4P2MAw2wjz4FTZlZ2efp7zxYqJtYQ7shyhdwLgOhkDFGzZjLl4axsJJ8HWWxhE44Rtd/UdKPYWEqFeFulADSps9bpkdN5DByxH7DgxyfU5SLoIvYAscg7LQEB6EJ1ydIusALIQ20AAqwDkogF/gc1jOEpLt/xETng6mFVTaZhoZf03Ih7jSk9APvXYxUC+45K68kDLjusR/B8yG42DSktEPnQXTQP41cApMWvt5EPvJF/t1dC4HP4O0BaoXC3IGfNVgHBwC01EqE6FRVD/szeENOAOmSVGxsWyM0N1Goewf1Ql7NjwGm8GkJ/IRtIzqE9qI03X2gUnvQMlF7xluhN2UlcMRsHWAr12MFT9QKfF6pE8uHHOD7KWsE14vsk1gGegPmshpkD71g2lXh5lwBkx7qDwHOX6s1bG3guehmdnCEt9IMI0M/cXaRLYAvRyhpvvBOP2BlX+ngna+YsJeByaBvYRa41rr1cJgbFVgF0h6d9Lnapxd4G8waSLnXOM1f3BsU5xdb3lX32d17HpSg2EnRElrvp/FW4ntLResDaqR2VWWsgYOvRwLwO7SXOqaiJJ+lC4543HK9WEA43XBthxmQxPn1yYxHn5z7RaUHxP7JSR3Q2xrnb8SZQNXLyoIzoHVYBorL43KYHc8vMOTXfA/lDVtNOqN4V04D6Y/qQyHRP6m1PY8Gg6ASU9K+bk2dDMjZS8bO1li1GMzzTIHBu1WcSZcgbhKMArCA5GWQ3Mb0y+xNwH9OFt2VAt3wFxQWpS6+310F7XObGPQnahlAdTjTFg/aBBsgChdxCjfozZuWOLrDCsg1L8YmqbEY2gD9vhe9Z3Y40xYE/KlH9/bsdZ3UF8M/lpNXg67ToIDYRuY9NLdlwxSBYOCJD2Czr6TdpwJq6+0G4ZABRuDenlQ3t0FJq1VHaTs5bbwRIld13wd7EZoAynK2zSWg6QUpqNhUrTjTFhnYaW4m5Idgwo+nX8Vo1jTHiraZHRsLSbs+vE26fxkHJXjIB2BW/yetP0JTw58fpbIeHpTP8aqCMooob7H0MMf2+rYZ3jBA2VXHn7bBSjnpT2J4ZM/ncqnc3h2P+Y77Pr+kzrCMib2HjROWIr+TKD6l2sOxV9GE17pDPpauNPVrdDmUMY1tNbHQBXXLrSgqyjz6dMJ8uAwaB4D4DPGTz4tvkAOYpsP0l3QXIHapY6AFG6T2sU+THiysrTvK4voEfamVN+rVQ6TOQmvMEAurHED6Q6H54uvnE83tG2izgQ+AEknrw4uIFlg6wPrwddB11AezrSU7Bo63dkmFL4PL7uxdChKyR60G4Eyi7TE7tJURj0DOhbOxJHyK7kT+tBUytNxrwAk22D0y22ZJBxp/ihGsVFKfyLLyjpLB/s47ZKYMBPagFGTlpTY5zPplMMzMadgGr72oK9nG0QT/4b4J8HWO6bLkg30hi8D+5HOG6uoSpTldl33shhU3246Odke/jv1vuYPS3ydwHI41YS+5W9y71cdZAsVLok8FxC1JPp6nVMPQjhuBX00+lpC455wwmpjLwUDwN9Olez1TrwPlvipFv4BthZLMuFP1Blpn6iXMg8M7cAucp66SYcQJfH6KR1cA7teqNGgOxRKL+dY0MuzzzljTZjY9qBrS4lsZS+dzaMuFbO9QP1N0KIvD8PgJzoOh2SuxCadgL1g61q2izAPcln7SodHIdPLhbtIXENnbB11dW2NOx1SRVBPMPWUl0YuaCfytY7Gw5ADPWA1+FpJ435/dNq1wLbmdHdYT6MyNAB/7U/xx0rWCbob7KUbag5s2fA46B8pvjbTuOAZdlJ/GoqlL2xVYD9I6SZ8GN940LnctJiK7nJx4dBdKHCRC8II7Fqr4yBcq/pfwiRISYXWH7sOUVPAflzKHcOeB1FSes2c4wlY5HpqEk3ton6JvRnoM0Y7l1JhK99vdeyl4SnYDqZzVPpYjEraU83pSj2pZyHbj4usE9TbdVJhB490sXoxIkXfrpAPvrQuu4YdsC11Qcr9A6FGGJO2TbB2Jv8lG5M2OMJB39thNvhpcQftwRC1E9bDbktsRMSQVzYxgB65vdFUEzm4dqaexFQD5Vu96SYtq4mQti++CS74NGWzTNfI6KNzNzjgBlOhnSoPlMz1yaP0o5epNYwAPU5fWtstM10Ef0c44TrNyRQby8dA7UBfwb6U9vRD9oBeOr1EvjbSSMnBURcjphPsdR01TsOouBLbGEh38kUIczCmSG3H2g8qRV0Me31QrrU7q6XwUFRslO3KacP1YlBtxzoE3QuNQUc+fZFshU3wEjwCpu1UVsE20FlbOVqfYB3B1vQh6s+wdS+ivL7iB5WFUWAbD9WMWoq39fWdZcTVmMRtoImvAk3+LCjFaQlsBaW8ByK6xjLFXhKxRguCmJiWgb4ylH91oivg8Wt5XLX+AzGCkeGllMgMAAAAAElFTkSuQmCC"/>
      {settings.menubar_style !== "text" && settings.menubar_style !== "gauge" && (
      <Progress value={{op:"data", collection:"current", where:{source:"codex"}, latest:true, field:"session_pct"}} max={100} color={{op:"data", collection:"current", where:{source:"codex"}, latest:true, field:"session_color"}}/>
      )}
      {settings.menubar_style === "text" && (
      <Text content={{op:"data", collection:"current", where:{source:"codex"}, latest:true, field:"session_pct_text"}} className="text-[12px] font-semibold"/>
      )}
      {settings.menubar_style === "gauge" && (
      <Meter width={16} height={16} value={{op:"data", collection:"current", where:{source:"codex"}, latest:true, field:"session_pct"}} max={100} color={{op:"data", collection:"current", where:{source:"codex"}, latest:true, field:"session_color"}}/>
      )}
    </HStack>
)}
      </VStack>
    )}
    <Icon symbol="gauge"/>
  </TrayLabel>

  <TrayMenu>
    <TrayMenuItem label={t.menuRefresh} onSelect="refreshNow"/>
    <TrayMenuItem label={t.menuQuit} quit/>
  </TrayMenu>

  <TrayPopover>
    <VStack gap={8} className="px-3 py-2 select-none w-[280px]">
      <DataList collection="current" query={{where:{enabled:true}, orderBy:[{field:"order", direction:"asc"}]}}>
        <Item>
          <VStack gap={3}>
            <HStack className="items-center">
              <Text className="text-[11px] font-semibold uppercase tracking-wider">{item.label}</Text>
            </HStack>
            {item.ok && (
            <VStack gap={1}>
              <HStack className="items-center">
                <Text className="text-[10px] uppercase tracking-wider">{t.session}</Text>
                <Spacer/>
                <Text className="text-xs font-semibold tabular-nums">{item.session_pct_text}</Text>
              </HStack>
              <Progress value={item.session_pct} max={100} color={item.session_color} size="sm"/>
              <Text className="text-[10px] text-[var(--ag-muted)] leading-tight">{t.resets} {item.session_reset_text}</Text>
            </VStack>
            )}
            {item.ok && (
            <VStack gap={1}>
              <HStack className="items-center">
                <Text className="text-[10px] uppercase tracking-wider">{t.week}</Text>
                <Spacer/>
                <Text className="text-xs font-semibold tabular-nums">{item.weekly_pct_text}</Text>
              </HStack>
              <Progress value={item.weekly_pct} max={100} color={item.weekly_color} size="sm"/>
              <Text className="text-[10px] text-[var(--ag-muted)] leading-tight">{t.resets} {item.weekly_reset_text}</Text>
            </VStack>
            )}
            {item.needs_auth && (
            <VStack gap={2} className="items-start">
              <Text className="text-[10px] text-[var(--ag-muted)] leading-tight">{t.expired}</Text>
              <Button label={t.reauth} size="sm" variant="bordered" onClick={() => scripts.refreshNow()}/>
            </VStack>
            )}
          </VStack>
        </Item>
        <Empty>
          <Text className="text-[11px] text-[var(--ag-muted)] leading-tight">{t.empty}</Text>
        </Empty>
      </DataList>
    </VStack>
  </TrayPopover>
</Tray>
