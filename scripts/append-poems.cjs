// 追加新诗词到 poems.ts
const fs = require('fs')
const path = '/Users/eighteenman/工作/童慧行/apps/xueshici/src/data/poems.ts'
const content = fs.readFileSync(path, 'utf8')

// 找到数组结束位置: 最后一个 ']' 后面跟着 '\n\nexport'
// 使用灵活正则替换
const newData = fs.readFileSync('/tmp/new_poems.tmp', 'utf8').trim()

const result = content.replace(
  /^](\n{2,3})export const poemsData = poemData/m,
  `,\n${newData}\n]\n$1export const poemsData = poemData`
)

if (result === content) {
  console.error('替换失败，文件未改变')
  console.error('文件末尾字节:', JSON.stringify(content.slice(-80)))
  process.exit(1)
}

fs.writeFileSync(path, result)
console.log('追加完成')
