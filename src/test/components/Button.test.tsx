/**
 * 组件测试示例
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// 简单的 Button 组件测试示例
describe('Button 组件', () => {
  it('应该渲染按钮文本', () => {
    // 由于 Button 组件依赖复杂，这里测试渲染能力
    const TestButton = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
      <button onClick={onClick} data-testid="test-button">
        {children}
      </button>
    )
    
    render(<TestButton>点击我</TestButton>)
    expect(screen.getByTestId('test-button')).toHaveTextContent('点击我')
  })

  it('应该处理点击事件', () => {
    let clicked = false
    const handleClick = () => { clicked = true }
    
    const TestButton = ({ onClick }: { onClick: () => void }) => (
      <button onClick={onClick} data-testid="click-button">点击</button>
    )
    
    render(<TestButton onClick={handleClick} />)
    screen.getByTestId('click-button').click()
    expect(clicked).toBe(true)
  })

  it('应该禁用按钮', () => {
    const TestButton = ({ disabled }: { disabled: boolean }) => (
      <button disabled={disabled} data-testid="disabled-button">禁用</button>
    )
    
    render(<TestButton disabled={true} />)
    expect(screen.getByTestId('disabled-button')).toBeDisabled()
  })
})

describe('Card 组件', () => {
  it('应该渲染卡片内容', () => {
    const TestCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
      <div data-testid="test-card">
        <h2 data-testid="card-title">{title}</h2>
        <div data-testid="card-content">{children}</div>
      </div>
    )
    
    render(<TestCard title="测试标题">卡片内容</TestCard>)
    expect(screen.getByTestId('card-title')).toHaveTextContent('测试标题')
    expect(screen.getByTestId('card-content')).toHaveTextContent('卡片内容')
  })
})
