SELECT    id,     name,    age    FROM    users    WHERE    age > 18    ORDER BY    name;

SELECT id, name, email, phone, address, city, state, zip_code, country, created_at, updated_at FROM users WHERE status = 'active' ORDER BY created_at DESC;

SELECT id FROM users WHERE name = 'John' AND age > 25 OR status = 'active';

SELECT    e.employee_id,    e.first_name,    e.last_name,    d.department_name    FROM    employees e    JOIN    departments d    ON    e.department_id = d.department_id    WHERE    e.salary > 5000    AND    e.hire_date > '2020-01-01';

select o.order_id, c.customer_name, SUM(oi.quantity * p.price) AS total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.order_date >= '2023-01-01' GROUP BY o.order_id, c.customer_name HAVING SUM(oi.quantity * p.price) > 1000 ORDER BY total_amount DESC;

select department_name, (select count(*) from employees e where e.department_id = d.department_id) as employee_count from departments d where department_id in (select department_id from employees group by department_id having count(*) > 5);

-- 查询高价值客户
select c.customer_id, c.name, 
/* 计算客户总消费金额 */
sum(o.amount) as total_spent
from customers c
join orders o on c.customer_id = o.customer_id
where o.order_date >= '2023-01-01' -- 只查询今年的订单
group by c.customer_id, c.name
having sum(o.amount) > 1000 -- 高价值客户标准
order by total_spent desc;

select p.product_id, p.product_name, p.price, c.category_name from products p join categories c on p.category_id = c.category_id where (p.price between 10 and 50 or p.price > 100) and p.stock_quantity > 0 and (c.category_name = 'Electronics' or c.category_name = 'Books') order by p.price asc;

select e.employee_id, e.first_name, e.last_name, e.email, e.phone_number, e.hire_date, e.job_id, e.salary, e.commission_pct, e.manager_id, e.department_id, d.department_name, j.job_title, l.city, l.state_province, l.country_id, c.country_name, r.region_name from employees e join departments d on e.department_id = d.department_id join jobs j on e.job_id = j.job_id join locations l on d.location_id = l.location_id join countries c on l.country_id = c.country_id join regions r on c.region_id = r.region_id where e.salary > 5000;

insert into employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, commission_pct, manager_id, department_id) values (207, 'John', 'Doe', 'john.doe@example.com', '515.123.4567', '2023-05-21', 'IT_PROG', 6000, null, 103, 60);

update employees set salary = salary * 1.1, commission_pct = commission_pct * 1.2 where department_id = 80 and commission_pct is not null;

create table project_assignments (assignment_id number(6) primary key, employee_id number(6) not null references employees(employee_id), project_id number(6) not null references projects(project_id), start_date date not null, end_date date, role varchar2(50), hours_per_week number(4,2), constraint pk_proj_assign unique (employee_id, project_id, start_date));

select employee_id, first_name, last_name, salary, case when salary < 5000 then 'Low' when salary between 5000 and 10000 then 'Medium' when salary > 10000 then 'High' else 'Unknown' end as salary_category from employees order by salary desc;